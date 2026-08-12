import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Settings2,
  Sparkles,
  Search,
  ShieldCheck,
  Activity,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getApiUrl } from "@/lib/utils";

interface BuildingData {
  id: number;
  buildingName: string;
  hasWings: boolean;
  status: string;
}

interface Wing {
  id: number;
  wingName: string;
  status: string;
}

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem("admin_auth");

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    return parsed?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default function AdminBuildings() {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [wingsMap, setWingsMap] = useState<Record<number, Wing[]>>({});

  const [isLoading, setIsLoading] = useState(true);

  const [expandedBuilding, setExpandedBuilding] = useState<number | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");

  // Building form
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newHasWings, setNewHasWings] = useState(false);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);

  // Wing form
  const [showAddWing, setShowAddWing] = useState<number | null>(null);
  const [newWingName, setNewWingName] = useState("");
  const [isAddingWing, setIsAddingWing] = useState(false);

  /*
   * ============================================================
   * FETCH BUILDINGS
   * ============================================================
   */

  const fetchBuildings = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/manage`,
        {
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch buildings");
      }

      const data: BuildingData[] = await res.json();

      setBuildings(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load buildings";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  /*
   * ============================================================
   * FETCH WINGS
   * ============================================================
   */

  const fetchWings = useCallback(async (buildingId: number) => {
    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${buildingId}/wings/manage`,
        {
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch wings");
      }

      const data: Wing[] = await res.json();

      setWingsMap((prev) => ({
        ...prev,
        [buildingId]: data,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load wings";

      toast.error(message);
    }
  }, []);

  /*
   * ============================================================
   * EXPAND / COLLAPSE
   * ============================================================
   */

  const toggleBuildingExpand = (buildingId: number) => {
    if (expandedBuilding === buildingId) {
      setExpandedBuilding(null);
      return;
    }

    setExpandedBuilding(buildingId);

    if (!wingsMap[buildingId]) {
      fetchWings(buildingId);
    }
  };

  /*
   * ============================================================
   * ADD BUILDING
   * ============================================================
   */

  const handleAddBuilding = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = newBuildingName.trim();

    if (!name) {
      toast.error("Building name is required");
      return;
    }

    setIsAddingBuilding(true);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            buildingName: name,
            hasWings: newHasWings,
          }),
        },
      );

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: Failed to create building`;

        try {
          const errorData = await res.json();

          errorMessage =
            errorData.error ||
            errorData.message ||
            errorMessage;
        } catch {
          const text = await res.text().catch(() => "");

          if (text) {
            errorMessage = `HTTP ${res.status}: ${text.slice(
              0,
              200,
            )}`;
          }
        }

        toast.error(errorMessage);
        return;
      }

      toast.success("Building added successfully");

      setNewBuildingName("");
      setNewHasWings(false);
      setShowAddBuilding(false);

      await fetchBuildings();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create building";

      toast.error(message);
    } finally {
      setIsAddingBuilding(false);
    }
  };

  /*
   * ============================================================
   * TOGGLE BUILDING
   * ============================================================
   */

  const toggleBuildingStatus = async (building: BuildingData) => {
    const newStatus =
      building.status === "active"
        ? "inactive"
        : "active";

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${building.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(
        `Building ${
          newStatus === "active"
            ? "activated"
            : "deactivated"
        }`,
      );

      await fetchBuildings();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update status";

      toast.error(message);
    }
  };

  /*
   * ============================================================
   * DELETE BUILDING
   * ============================================================
   */

  const deleteBuilding = async (building: BuildingData) => {
    const confirmed = window.confirm(
      `Delete "${building.buildingName}"?\n\nThis will also remove all wings and residents in this building.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${building.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete building");
      }

      toast.success("Building deleted");

      if (expandedBuilding === building.id) {
        setExpandedBuilding(null);
      }

      setWingsMap((prev) => {
        const updated = { ...prev };

        delete updated[building.id];

        return updated;
      });

      await fetchBuildings();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete building";

      toast.error(message);
    }
  };

  /*
   * ============================================================
   * ADD WING
   * ============================================================
   */

  const handleAddWing = async (buildingId: number) => {
    const name = newWingName.trim();

    if (!name) {
      toast.error("Wing name is required");
      return;
    }

    setIsAddingWing(true);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${buildingId}/wings`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            wingName: name,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({
            error: "Failed to create wing",
          }));

        toast.error(
          errorData.error || "Failed to create wing",
        );

        return;
      }

      toast.success("Wing added successfully");

      setNewWingName("");
      setShowAddWing(null);

      await fetchWings(buildingId);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create wing";

      toast.error(message);
    } finally {
      setIsAddingWing(false);
    }
  };

  /*
   * ============================================================
   * TOGGLE WING
   * ============================================================
   */

  const toggleWingStatus = async (
    buildingId: number,
    wing: Wing,
  ) => {
    const newStatus =
      wing.status === "active"
        ? "inactive"
        : "active";

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${buildingId}/wings/${wing.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(
        `Wing ${
          newStatus === "active"
            ? "activated"
            : "deactivated"
        }`,
      );

      await fetchWings(buildingId);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update status";

      toast.error(message);
    }
  };

  /*
   * ============================================================
   * DELETE WING
   * ============================================================
   */

  const deleteWing = async (
    buildingId: number,
    wing: Wing,
  ) => {
    const confirmed = window.confirm(
      `Delete wing "${wing.wingName}"?\n\nThis may affect existing residents.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/buildings/${buildingId}/wings/${wing.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete wing");
      }

      toast.success("Wing deleted");

      await fetchWings(buildingId);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete wing";

      toast.error(message);
    }
  };

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const activeBuildings = buildings.filter(
    (building) => building.status === "active",
  ).length;

  const inactiveBuildings =
    buildings.length - activeBuildings;

  const totalWings = Object.values(wingsMap).reduce(
    (total, wings) => total + wings.length,
    0,
  );

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  const filteredBuildings = buildings.filter(
    (building) =>
      building.buildingName
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );

  /*
   * ============================================================
   * CLOSE BUILDING FORM
   * ============================================================
   */

  const closeBuildingForm = () => {
    setShowAddBuilding(false);
    setNewBuildingName("");
    setNewHasWings(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#050505] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-yellow-400/5 blur-[100px]" />
      </div>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="relative overflow-hidden border-b border-white/[0.08] bg-black/70 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.08] via-transparent to-orange-500/[0.06]" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Header Left */}

            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <Link
                href="/admin"
                className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 backdrop-blur-xl transition-all duration-300 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
              >
                <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>

              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Administration
                </div>

                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Buildings
                </h1>

                <p className="mt-1 text-sm text-white/45">
                  Manage buildings, wings and configurations
                </p>
              </div>
            </motion.div>

            {/* Add Building */}

            <motion.button
              type="button"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddBuilding(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400 px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(245,158,11,0.15)] transition hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
              Add Building
            </motion.button>
          </div>

          {/* Stats */}

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Total Buildings",
                value: buildings.length,
                icon: Building2,
                className: "text-white",
              },
              {
                label: "Active",
                value: activeBuildings,
                icon: Activity,
                className: "text-emerald-400",
              },
              {
                label: "Inactive",
                value: inactiveBuildings,
                icon: ShieldCheck,
                className: "text-white/50",
              },
              {
                label: "Wings Loaded",
                value: totalWings,
                icon: Layers,
                className: "text-amber-400",
              },
            ].map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + index * 0.06,
                  }}
                  whileHover={{ y: -2 }}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition-colors hover:border-amber-400/20 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      {stat.label}
                    </p>

                    <Icon
                      className={cn(
                        "h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100",
                        stat.className,
                      )}
                    />
                  </div>

                  <p
                    className={cn(
                      "mt-2 text-2xl font-black",
                      stat.className,
                    )}
                  >
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Search */}

        {!isLoading && buildings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-7"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search building..."
                className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.035] py-4 pl-12 pr-12 text-sm text-white shadow-xl outline-none backdrop-blur-xl transition-all placeholder:text-white/25 focus:border-amber-400/40 focus:bg-white/[0.05] focus:ring-4 focus:ring-amber-400/5"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 transition hover:bg-amber-400/10 hover:text-amber-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="mt-2 flex items-center justify-between px-1">
                <p className="text-xs text-white/35">
                  Showing{" "}
                  <span className="font-bold text-amber-400">
                    {filteredBuildings.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-white/70">
                    {buildings.length}
                  </span>{" "}
                  buildings
                </p>

                {filteredBuildings.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-amber-400 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ======================================================
            ADD BUILDING FORM
        ====================================================== */}

        <AnimatePresence>
          {showAddBuilding && (
            <motion.form
              onSubmit={handleAddBuilding}
              initial={{
                opacity: 0,
                height: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                y: 0,
              }}
              exit={{
                opacity: 0,
                height: 0,
                y: -10,
              }}
              transition={{ duration: 0.3 }}
              className="mb-7 overflow-hidden rounded-3xl border border-amber-400/20 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-2xl"
            >
              <div className="border-b border-white/[0.07] bg-amber-400/[0.05] px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </div>

                    <div>
                      <h2 className="font-black text-white">
                        Add New Building
                      </h2>

                      <p className="text-xs text-white/40">
                        Create a building for your community
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeBuildingForm}
                    className="rounded-xl p-2 text-white/40 transition hover:bg-white/5 hover:text-amber-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                    Building Name
                    <span className="ml-1 text-amber-400">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={newBuildingName}
                    onChange={(e) =>
                      setNewBuildingName(e.target.value)
                    }
                    placeholder="e.g. Meditiya Tower"
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40 focus:ring-4 focus:ring-amber-400/5"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                    Building Structure
                  </label>

                  <div className="flex h-[46px] gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewHasWings(false)
                      }
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition",
                        !newHasWings
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-white/10 text-white/40 hover:bg-white/5",
                      )}
                    >
                      <Home className="h-3.5 w-3.5" />
                      No Wings
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNewHasWings(true)
                      }
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition",
                        newHasWings
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-white/10 text-white/40 hover:bg-white/5",
                      )}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Has Wings
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-black/20 p-5 sm:flex-row sm:justify-end sm:p-4">
                <button
                  type="button"
                  onClick={closeBuildingForm}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAddingBuilding}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAddingBuilding ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}

                  {isAddingBuilding
                    ? "Creating..."
                    : "Create Building"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-3xl border border-white/[0.07] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : buildings.length === 0 ? (
          /* ====================================================
             EMPTY
          ==================================================== */

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-dashed border-amber-400/20 bg-white/[0.025] px-6 py-20 text-center backdrop-blur-xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Building2 className="h-8 w-8 text-amber-400" />
            </div>

            <h2 className="mt-5 text-xl font-black text-white">
              No buildings yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
              Add your first building to start managing
              wings, residents and community data.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowAddBuilding(true)
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
              Add First Building
            </button>
          </motion.div>
        ) : filteredBuildings.length === 0 ? (
          /* ====================================================
             NO SEARCH RESULTS
          ==================================================== */

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-dashed border-amber-400/20 bg-white/[0.025] px-6 py-20 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Search className="h-8 w-8 text-amber-400" />
            </div>

            <h2 className="mt-5 text-xl font-black text-white">
              No buildings found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
              No building matches{" "}
              <span className="font-semibold text-white">
                "{searchQuery}"
              </span>
              .
            </p>

            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              <X className="h-4 w-4" />
              Clear Search
            </button>
          </motion.div>
        ) : (
          /* ====================================================
             BUILDINGS
          ==================================================== */

          <motion.div
            layout
            className="grid gap-4 lg:grid-cols-2"
          >
            {filteredBuildings.map((building, index) => {
              const isExpanded =
                expandedBuilding === building.id;

              const wings =
                wingsMap[building.id] || [];

              const activeWings = wings.filter(
                (wing) => wing.status === "active",
              ).length;

              return (
                <motion.div
                  layout
                  key={building.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.04,
                  }}
                  whileHover={{
                    y: -2,
                  }}
                  className={cn(
                    "group overflow-hidden rounded-3xl border bg-white/[0.035] shadow-2xl backdrop-blur-2xl transition-all duration-300",
                    isExpanded
                      ? "border-amber-400/30 shadow-amber-500/10"
                      : "border-white/[0.08] hover:border-amber-400/20",
                    building.status !== "active" &&
                      "opacity-60",
                  )}
                >
                  {/* Building Card */}

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          toggleBuildingExpand(
                            building.id,
                          )
                        }
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition",
                          building.status === "active"
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                            : "border-white/10 bg-white/5 text-white/30",
                        )}
                      >
                        <Building2 className="h-6 w-6" />
                      </motion.button>

                      {/* Details */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-black text-white">
                            {building.buildingName}
                          </h2>

                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                              building.status === "active"
                                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                                : "border-white/10 bg-white/5 text-white/40",
                            )}
                          >
                            {building.status}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/35">
                          {building.hasWings ? (
                            <>
                              <span className="inline-flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5" />
                                {wings.length} Wings
                              </span>

                              {wings.length > 0 && (
                                <>
                                  <span>•</span>

                                  <span>
                                    {activeWings} active
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Home className="h-3.5 w-3.5" />
                              Single Structure
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            toggleBuildingExpand(
                              building.id,
                            )
                          }
                          className="rounded-xl p-2 text-white/30 transition hover:bg-amber-400/10 hover:text-amber-300"
                          title={
                            isExpanded
                              ? "Collapse"
                              : "Manage wings"
                          }
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleBuildingStatus(
                              building,
                            )
                          }
                          className="rounded-xl p-2 text-white/30 transition hover:bg-amber-400/10 hover:text-amber-300"
                          title="Toggle status"
                        >
                          {building.status ===
                          "active" ? (
                            <ToggleLeft className="h-5 w-5" />
                          ) : (
                            <ToggleRight className="h-5 w-5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteBuilding(
                              building,
                            )
                          }
                          className="rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                          title="Delete building"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Status */}

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            building.status ===
                              "active"
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                              : "bg-white/20",
                          )}
                        />

                        {building.status ===
                        "active"
                          ? "Building is active"
                          : "Building is inactive"}
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/20">
                        ID #{building.id}
                      </span>
                    </div>
                  </div>

                  {/* =================================================
                      WINGS PANEL
                  ================================================= */}

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                        }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                        }}
                        transition={{
                          duration: 0.3,
                        }}
                        className="border-t border-amber-400/10 bg-amber-400/[0.025]"
                      >
                        <div className="flex items-center justify-between px-5 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-amber-400" />

                              <h3 className="text-sm font-black text-white">
                                Wing Management
                              </h3>
                            </div>

                            <p className="mt-1 text-xs text-white/30">
                              Manage wings inside this building
                            </p>
                          </div>

                          {building.hasWings && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddWing(
                                  building.id,
                                );
                                setNewWingName("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400/20"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Wing
                            </button>
                          )}
                        </div>

                        <div className="px-5 pb-5">
                          {!building.hasWings ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
                              <Home className="mx-auto h-7 w-7 text-white/20" />

                              <p className="mt-2 text-sm font-bold text-white/70">
                                No wings required
                              </p>

                              <p className="mt-1 text-xs text-white/30">
                                This building is configured
                                as a single structure.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Add Wing Form */}

                              <AnimatePresence>
                                {showAddWing ===
                                  building.id && (
                                  <motion.form
                                    initial={{
                                      opacity: 0,
                                      y: -10,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      y: -10,
                                    }}
                                    onSubmit={(e) => {
                                      e.preventDefault();

                                      handleAddWing(
                                        building.id,
                                      );
                                    }}
                                    className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-3"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <input
                                        type="text"
                                        value={
                                          newWingName
                                        }
                                        onChange={(e) =>
                                          setNewWingName(
                                            e.target
                                              .value,
                                          )
                                        }
                                        placeholder="Wing name e.g. A, B, C"
                                        autoFocus
                                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-amber-400/40"
                                      />

                                      <div className="flex gap-2">
                                        <button
                                          type="submit"
                                          disabled={
                                            isAddingWing
                                          }
                                          className="flex-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-black transition hover:bg-amber-300 disabled:opacity-50 sm:flex-none"
                                        >
                                          {isAddingWing
                                            ? "Adding..."
                                            : "Add Wing"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowAddWing(
                                              null,
                                            );
                                            setNewWingName(
                                              "",
                                            );
                                          }}
                                          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/50 transition hover:bg-white/5 hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </motion.form>
                                )}
                              </AnimatePresence>

                              {/* Wing Loading */}

                              {!wingsMap[
                                building.id
                              ] ? (
                                <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-black/20 py-8">
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
                                </div>
                              ) : wings.length ===
                                0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-7 text-center">
                                  <Layers className="mx-auto h-7 w-7 text-white/20" />

                                  <p className="mt-2 text-sm font-bold text-white/70">
                                    No wings yet
                                  </p>

                                  <p className="mt-1 text-xs text-white/30">
                                    Add Wing A, B, C or
                                    another custom wing.
                                  </p>

                                  {showAddWing !==
                                    building.id && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowAddWing(
                                          building.id,
                                        )
                                      }
                                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-amber-400 hover:underline"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Add your first wing
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {wings.map(
                                    (wing, wingIndex) => (
                                      <motion.div
                                        layout
                                        key={wing.id}
                                        initial={{
                                          opacity: 0,
                                          x: -10,
                                        }}
                                        animate={{
                                          opacity: 1,
                                          x: 0,
                                        }}
                                        transition={{
                                          duration: 0.25,
                                          delay:
                                            wingIndex *
                                            0.03,
                                        }}
                                        className={cn(
                                          "group flex items-center justify-between rounded-2xl border bg-black/20 p-3 transition",
                                          wing.status ===
                                            "active"
                                            ? "border-white/[0.08] hover:border-amber-400/20"
                                            : "border-dashed border-white/10 opacity-50",
                                        )}
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div
                                            className={cn(
                                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                                              wing.status ===
                                                "active"
                                                ? "border border-amber-400/20 bg-amber-400/10 text-amber-300"
                                                : "bg-white/5 text-white/30",
                                            )}
                                          >
                                            {wing.wingName
                                              .slice(
                                                0,
                                                1,
                                              )
                                              .toUpperCase()}
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-white/80">
                                              Wing{" "}
                                              {
                                                wing.wingName
                                              }
                                            </p>

                                            <div className="mt-0.5 flex items-center gap-1.5">
                                              <span
                                                className={cn(
                                                  "h-1.5 w-1.5 rounded-full",
                                                  wing.status ===
                                                    "active"
                                                    ? "bg-emerald-400"
                                                    : "bg-white/20",
                                                )}
                                              />

                                              <span className="text-[10px] font-bold uppercase tracking-wide text-white/30">
                                                {
                                                  wing.status
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-60 transition group-hover:opacity-100">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleWingStatus(
                                                building.id,
                                                wing,
                                              )
                                            }
                                            className="rounded-xl p-2 text-white/30 transition hover:bg-amber-400/10 hover:text-amber-300"
                                            title="Toggle status"
                                          >
                                            {wing.status ===
                                            "active" ? (
                                              <ToggleLeft className="h-4 w-4" />
                                            ) : (
                                              <ToggleRight className="h-4 w-4" />
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteWing(
                                                building.id,
                                                wing,
                                              )
                                            }
                                            className="rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                                            title="Delete wing"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </motion.div>
                                    ),
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* Bottom Ambient Glow */}

      <div className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-[70%] -translate-x-1/2 bg-amber-400/[0.03] blur-[80px]" />
    </div>
  );
}