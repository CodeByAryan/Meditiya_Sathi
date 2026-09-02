import { Router, type IRouter } from "express";
import { db, festivalsTable, festivalDonationsTable, outsiderDonationsTable, residentsTable, buildingsTable, wingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

export interface ShowcaseBadge {
  label: string;
  icon: string;
  key: string;
  color: string;
}

export function getDonationBadge(amount: number, rank: number): ShowcaseBadge {
  if (rank === 1) {
    return { label: "Top Contributor", icon: "👑", key: "top", color: "amber" };
  }
  if (rank <= 3) {
    return { label: "Top Contributor", icon: "🏆", key: "top", color: "amber" };
  }
  if (amount >= 5000 || rank <= 10) {
    return { label: "High Contributor", icon: "🔥", key: "high", color: "orange" };
  }
  if (amount >= 2000 || rank <= 25) {
    return { label: "Community Supporter", icon: "💫", key: "supporter", color: "yellow" };
  }
  return { label: "Community Champion", icon: "❤️", key: "champion", color: "rose" };
}

export interface PublicDonorItem {
  id: string;
  donorName: string;
  buildingId: number | null;
  buildingName: string | null;
  wingName: string | null;
  flatNo: string | null;
  amount: number;
  festivalName: string;
  paymentMethod: string;
  paymentDate: string | null;
  createdAt: string | null;
  rank: number;
  badge: ShowcaseBadge;
  donorType: "resident" | "outsider";
}

// ── Public Showcase Festivals Configuration ───────────────────────────────────
// Currently showcase ONLY Ganesh Utsav 2026. Future festivals can simply be added
// to this array or configured dynamically without rebuilding the feature.
export const CURRENT_PUBLIC_SHOWCASE_FESTIVAL_SLUGS: string[] = [
  "ganesh-utsav-2026",
];

// ── GET /api/donation-showcase/festivals ───────────────────────────────────────
// Get list of festivals currently enabled for the public showcase
router.get("/donation-showcase/festivals", async (req, res): Promise<void> => {
  try {
    const allFestivals = await db
      .select({
        id: festivalsTable.id,
        name: festivalsTable.name,
        slug: festivalsTable.slug,
        description: festivalsTable.description,
        year: festivalsTable.year,
        startDate: festivalsTable.startDate,
        endDate: festivalsTable.endDate,
        status: festivalsTable.status,
        bannerImageUrl: festivalsTable.bannerImageUrl,
        isActive: festivalsTable.isActive,
      })
      .from(festivalsTable);

    // Filter by configured public showcase festival slugs (currently: Ganesh Utsav 2026 only)
    let showcaseFestivals = allFestivals.filter(f =>
      CURRENT_PUBLIC_SHOWCASE_FESTIVAL_SLUGS.includes(f.slug)
    );

    // If slug matching finds no records (e.g. slight slug difference), match by Ganesh name
    if (showcaseFestivals.length === 0 && allFestivals.length > 0) {
      const ganesh = allFestivals.find(f =>
        f.name.toLowerCase().includes("ganesh") || f.name.toLowerCase().includes("ganpati")
      );
      showcaseFestivals = ganesh ? [ganesh] : [allFestivals[0]];
    }

    // Sort: active first, then upcoming, then completed, then year desc
    const sortedFestivals = showcaseFestivals.sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, upcoming: 1, completed: 2 };
      const orderA = statusOrder[a.status] ?? 3;
      const orderB = statusOrder[b.status] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      if (b.year !== a.year) return b.year - a.year;
      return String(b.startDate).localeCompare(String(a.startDate));
    });

    res.json({ festivals: sortedFestivals });
  } catch (err: any) {
    console.error("Error fetching showcase festivals:", err);
    res.status(500).json({ error: "Failed to fetch festivals for donation showcase" });
  }
});

// Helper to fetch and rank all confirmed donations for a given festival
async function getFestivalConfirmedDonations(festivalId: number): Promise<{
  festival: any;
  allDonors: PublicDonorItem[];
  buildings: { id: number; name: string }[];
}> {
  // 1. Get festival details
  const [festival] = await db
    .select()
    .from(festivalsTable)
    .where(eq(festivalsTable.id, festivalId))
    .limit(1);

  if (!festival) {
    throw new Error("Festival not found");
  }

  const festivalDisplayName = `${festival.name} ${festival.year}`;

  // 2. Fetch confirmed resident donations (exclude pending, null or 0 amounts)
  const residentRows = await db.execute(sql`
    SELECT
      fd.id,
      fd.amount::numeric as amount,
      fd.payment_method,
      fd.payment_date,
      fd.created_at,
      r.full_name as resident_name,
      r.flat_no,
      r.building_id,
      r.wing_id,
      b.building_name,
      w.wing_name
    FROM festival_donations fd
    JOIN residents r ON fd.resident_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN wings w ON r.wing_id = w.id
    WHERE fd.festival_id = ${festivalId}
      AND fd.payment_method != 'pending'
      AND fd.amount IS NOT NULL
      AND fd.amount::numeric > 0
  `);

  // 3. Fetch confirmed outsider donations (exclude pending, null or 0 amounts)
  const outsiderRows = await db.execute(sql`
    SELECT
      od.id,
      od.full_name,
      od.amount::numeric as amount,
      od.payment_method,
      od.payment_date,
      od.created_at
    FROM outsider_donations od
    WHERE od.festival_id = ${festivalId}
      AND od.payment_status = 'paid'
      AND od.amount IS NOT NULL
      AND od.amount::numeric > 0
  `);

  // 4. Fetch all society buildings for filter options
  const societyBuildings = await db
    .select({
      id: buildingsTable.id,
      name: buildingsTable.buildingName,
    })
    .from(buildingsTable)
    .orderBy(buildingsTable.buildingName);

  // 5. Transform into unified donor list with sanitized public fields only
  const unrankedItems: Omit<PublicDonorItem, "rank" | "badge">[] = [];
  const buildingsMap = new Map<number, string>();

  // Add all existing buildings to map
  for (const b of societyBuildings) {
    buildingsMap.set(b.id, b.name);
  }

  for (const row of (residentRows.rows || []) as any[]) {
    const amt = parseFloat(String(row.amount || 0));
    if (amt > 0) {
      if (row.building_id && row.building_name) {
        buildingsMap.set(Number(row.building_id), String(row.building_name));
      }
      unrankedItems.push({
        id: `res-${row.id}`,
        donorName: row.resident_name || "Community Member",
        buildingId: row.building_id ? Number(row.building_id) : null,
        buildingName: row.building_name || null,
        wingName: row.wing_name || null,
        flatNo: row.flat_no || null,
        amount: amt,
        festivalName: festivalDisplayName,
        paymentMethod: row.payment_method || "cash",
        paymentDate: row.payment_date ? String(row.payment_date) : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        donorType: "resident",
      });
    }
  }

  for (const row of (outsiderRows.rows || []) as any[]) {
    const amt = parseFloat(String(row.amount || 0));
    if (amt > 0) {
      unrankedItems.push({
        id: `out-${row.id}`,
        donorName: row.full_name || "Well-wisher",
        buildingId: null,
        buildingName: "Well-wisher",
        wingName: null,
        flatNo: null,
        amount: amt,
        festivalName: festivalDisplayName,
        paymentMethod: row.payment_method || "cash",
        paymentDate: row.payment_date ? String(row.payment_date) : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        donorType: "outsider",
      });
    }
  }

  // 6. Sort descending by amount, then earliest paymentDate / createdAt
  unrankedItems.sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    const dateA = a.paymentDate || a.createdAt || "";
    const dateB = b.paymentDate || b.createdAt || "";
    return dateA.localeCompare(dateB);
  });

  // 7. Assign ranks and badges strictly for this festival
  const allDonors: PublicDonorItem[] = unrankedItems.map((item, index) => {
    const rank = index + 1;
    return {
      ...item,
      rank,
      badge: getDonationBadge(item.amount, rank),
    };
  });

  const buildings = Array.from(buildingsMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    festival,
    allDonors,
    buildings,
  };
}

async function isPublicShowcaseFestival(festivalId: number): Promise<boolean> {
  const [festival] = await db.select({ slug: festivalsTable.slug }).from(festivalsTable).where(eq(festivalsTable.id, festivalId)).limit(1);
  return Boolean(festival && CURRENT_PUBLIC_SHOWCASE_FESTIVAL_SLUGS.includes(festival.slug));
}

// ── GET /api/donation-showcase/:festivalId/search-contributor ───────────────────
router.get("/donation-showcase/:festivalId/search-contributor", async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(String(req.params.festivalId), 10);
    if (isNaN(festivalId) || festivalId <= 0) { res.status(400).json({ error: "Invalid festival ID" }); return; }
    const query = ((req.query.q as string) || "").trim().toLowerCase();
    if (!query) { res.json({ results: [] }); return; }
    if (!(await isPublicShowcaseFestival(festivalId))) { res.status(404).json({ error: "Festival showcase not found" }); return; }
    const data = await getFestivalConfirmedDonations(festivalId);
    const results = data.allDonors.filter(d => d.donorName.toLowerCase().includes(query) || d.flatNo?.toLowerCase().includes(query) || d.buildingName?.toLowerCase().includes(query) || d.wingName?.toLowerCase().includes(query));
    res.json({ results: results.slice(0, 10) });
  } catch (err) { console.error("Error searching contributors:", err); res.status(500).json({ error: "Failed to search contributors" }); }
});

// ── GET /api/donation-showcase/:festivalId ─────────────────────────────────────
// Full festival donation showcase with top 3, filtered donations, buildings (NO TOTAL COLLECTION)
router.get("/donation-showcase/:festivalId", async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(String(req.params.festivalId), 10);
    if (isNaN(festivalId) || festivalId <= 0) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }
    if (!(await isPublicShowcaseFestival(festivalId))) {
      res.status(404).json({ error: "Festival showcase not found" });
      return;
    }

    const data = await getFestivalConfirmedDonations(festivalId);

    // Filters and search from query params
    const buildingIdParam = req.query.buildingId as string | undefined;
    const searchParam = ((req.query.search as string) || "").trim().toLowerCase();
    const sortBy = (req.query.sortBy as string) || "amount_desc";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 24));

    let filtered = [...data.allDonors];

    // Filter by Building
    if (buildingIdParam && buildingIdParam !== "all") {
      const bid = parseInt(buildingIdParam, 10);
      if (!isNaN(bid)) {
        filtered = filtered.filter(d => d.buildingId === bid);
      } else if (buildingIdParam === "outsider") {
        filtered = filtered.filter(d => d.donorType === "outsider");
      }
    }

    // Filter by Search (name, building, wing, flat)
    if (searchParam) {
      filtered = filtered.filter(d => {
        const nameMatch = d.donorName.toLowerCase().includes(searchParam);
        const bldMatch = d.buildingName?.toLowerCase().includes(searchParam) || false;
        const wingMatch = d.wingName?.toLowerCase().includes(searchParam) || false;
        const flatMatch = d.flatNo?.toLowerCase().includes(searchParam) || false;
        return nameMatch || bldMatch || wingMatch || flatMatch;
      });
    }

    // Sort options
    if (sortBy === "amount_asc") {
      filtered.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === "amount_desc") {
      filtered.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === "date_desc") {
      filtered.sort((a, b) => {
        const dateA = a.paymentDate || a.createdAt || "";
        const dateB = b.paymentDate || b.createdAt || "";
        return dateB.localeCompare(dateA);
      });
    } else if (sortBy === "date_asc") {
      filtered.sort((a, b) => {
        const dateA = a.paymentDate || a.createdAt || "";
        const dateB = b.paymentDate || b.createdAt || "";
        return dateA.localeCompare(dateB);
      });
    }

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / limit);
    const offset = (page - 1) * limit;
    const paginatedDonations = filtered.slice(offset, offset + limit);

    // Festival Top 3 Podium and Top 10 Leaderboard
    const topDonors = data.allDonors.slice(0, 10);
    const podium = data.allDonors.slice(0, 3);

    // PRIVACY: Strictly return only public fields, NO total collection or aggregate money
    res.json({
      festival: {
        id: data.festival.id,
        name: data.festival.name,
        slug: data.festival.slug,
        year: data.festival.year,
        description: data.festival.description,
        startDate: data.festival.startDate,
        endDate: data.festival.endDate,
        status: data.festival.status,
        bannerImageUrl: data.festival.bannerImageUrl,
      },
      topDonors,
      podium,
      donations: paginatedDonations,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages,
        totalContributors: data.allDonors.length,
      },
      buildings: data.buildings,
    });
  } catch (err: any) {
    if (err?.message === "Festival not found") {
      res.status(404).json({ error: "Festival not found" });
      return;
    }
    console.error("Error fetching festival donation showcase:", err);
    res.status(500).json({ error: "Failed to fetch festival donation showcase" });
  }
});

export default router;
