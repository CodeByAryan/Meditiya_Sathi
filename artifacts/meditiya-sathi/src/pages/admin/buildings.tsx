import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Building2, Plus, Trash2, ToggleLeft, ToggleRight, Layers, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Building {
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
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function AdminBuildings() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [wingsMap, setWingsMap] = useState<Record<number, Wing[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBuilding, setExpandedBuilding] = useState<number | null>(null);

  // New building form
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newHasWings, setNewHasWings] = useState(false);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);

  // New wing form
  const [showAddWing, setShowAddWing] = useState<number | null>(null);
  const [newWingName, setNewWingName] = useState('');
  const [isAddingWing, setIsAddingWing] = useState(false);

  // Fetch all buildings
  const fetchBuildings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/buildings/manage', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch buildings');
      const data: Building[] = await res.json();
      setBuildings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load buildings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // Fetch wings for a building
  const fetchWings = useCallback(async (buildingId: number) => {
    try {
      const res = await fetch(`/api/admin/buildings/${buildingId}/wings/manage`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch wings');
      const data: Wing[] = await res.json();
      setWingsMap(prev => ({ ...prev, [buildingId]: data }));
    } catch {
      // Silently fail
    }
  }, []);

  const toggleBuildingExpand = (buildingId: number) => {
    if (expandedBuilding === buildingId) {
      setExpandedBuilding(null);
    } else {
      setExpandedBuilding(buildingId);
      if (!wingsMap[buildingId]) {
        fetchWings(buildingId);
      }
    }
  };

  // Add building
  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }

    setIsAddingBuilding(true);
    try {
      const res = await fetch('/api/admin/buildings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ buildingName: newBuildingName.trim(), hasWings: newHasWings }),
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}: Failed to create building`;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) errorMsg = `HTTP ${res.status}: ${text.slice(0, 200)}`;
        }
        toast.error(errorMsg);
        return;
      }

      toast.success('Building added successfully');
      setNewBuildingName('');
      setNewHasWings(false);
      setShowAddBuilding(false);
      fetchBuildings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create building');
    } finally {
      setIsAddingBuilding(false);
    }
  };

  // Toggle building status
  const toggleBuildingStatus = async (building: Building) => {
    const newStatus = building.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/buildings/${building.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Building ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchBuildings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // Delete building
  const deleteBuilding = async (building: Building) => {
    if (!confirm(`Delete "${building.buildingName}"? This will also remove all wings and residents in this building.`)) return;

    try {
      const res = await fetch(`/api/admin/buildings/${building.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Building deleted');
      fetchBuildings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete building');
    }
  };

  // Add wing
  const handleAddWing = async (buildingId: number) => {
    if (!newWingName.trim()) {
      toast.error('Wing name is required');
      return;
    }

    setIsAddingWing(true);
    try {
      const res = await fetch(`/api/admin/buildings/${buildingId}/wings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ wingName: newWingName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to create wing' }));
        toast.error(errData.error);
        return;
      }

      toast.success('Wing added successfully');
      setNewWingName('');
      setShowAddWing(null);
      fetchWings(buildingId);
      // Refresh the wings map
      setWingsMap(prev => {
        const updated = { ...prev };
        delete updated[buildingId];
        return updated;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create wing');
    } finally {
      setIsAddingWing(false);
    }
  };

  // Toggle wing status
  const toggleWingStatus = async (buildingId: number, wing: Wing) => {
    const newStatus = wing.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/buildings/${buildingId}/wings/${wing.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Wing ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchWings(buildingId);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // Delete wing
  const deleteWing = async (buildingId: number, wing: Wing) => {
    if (!confirm(`Delete wing "${wing.wingName}"? This may affect existing residents.`)) return;

    try {
      const res = await fetch(`/api/admin/buildings/${buildingId}/wings/${wing.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Wing deleted');
      fetchWings(buildingId);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete wing');
    }
  };

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-white">Buildings</h1>
              <p className="text-white/70">Manage buildings, wings, and configurations</p>
            </div>
            <button
              onClick={() => setShowAddBuilding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Add Building
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Add Building Form */}
        {showAddBuilding && (
          <form onSubmit={handleAddBuilding} className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> New Building
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Building Name <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  placeholder="e.g. Meditiya Tower"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Has Wings?</label>
                <div className="flex items-center gap-3 h-[42px]">
                  <button
                    type="button"
                    onClick={() => setNewHasWings(false)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all",
                      !newHasWings ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700" : "border-border text-muted-foreground"
                    )}
                  >
                    <X className="w-3 h-3 inline mr-1" /> No
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHasWings(true)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all",
                      newHasWings ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    <Check className="w-3 h-3 inline mr-1" /> Yes
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
              <button
                type="submit"
                disabled={isAddingBuilding}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {isAddingBuilding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Building
              </button>
              <button
                type="button"
                onClick={() => setShowAddBuilding(false)}
                className="px-6 py-2.5 border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Buildings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-lg font-medium">No buildings yet</p>
            <p className="text-sm mt-1">Click "Add Building" to create your first building.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buildings.map((building) => (
              <div key={building.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Building Header */}
                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleBuildingExpand(building.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Layers className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedBuilding === building.id && "rotate-90")} />
                    </button>
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-foreground">{building.buildingName}</span>
                      {building.hasWings && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Has Wings
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      building.status === 'active'
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                        : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                    )}>
                      {building.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleBuildingStatus(building)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Toggle status"
                    >
                      {building.status === 'active' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteBuilding(building)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Wings Section */}
                {expandedBuilding === building.id && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4 pl-14">
                    {/* Existing Wings */}
                    {wingsMap[building.id]?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {wingsMap[building.id].map((wing) => (
                          <div
                            key={wing.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border",
                              wing.status === 'active'
                                ? "bg-background border-border text-foreground"
                                : "bg-muted border-dashed text-muted-foreground"
                            )}
                          >
                            <span>{wing.wingName}</span>
                            <span className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                              wing.status === 'active' ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
                            )}>
                              {wing.status}
                            </span>
                            <button
                              onClick={() => toggleWingStatus(building.id, wing)}
                              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                              title="Toggle status"
                            >
                              {wing.status === 'active' ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => deleteWing(building.id, wing)}
                              className="p-0.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              title="Delete wing"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!wingsMap[building.id] || wingsMap[building.id].length === 0) && (
                      <p className="text-sm text-muted-foreground mb-3">No wings added yet.</p>
                    )}

                    {/* Add Wing Form */}
                    {showAddWing === building.id ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddWing(building.id); }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={newWingName}
                          onChange={(e) => setNewWingName(e.target.value)}
                          placeholder="e.g. A, B, C"
                          className="flex-1 max-w-[200px] px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={isAddingWing}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                        >
                          {isAddingWing ? '...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddWing(null); setNewWingName(''); }}
                          className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted/50"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowAddWing(building.id)}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Wing
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

