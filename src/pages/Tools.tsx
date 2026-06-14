import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MinimalHeader } from "@/components/MinimalHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CNCEditor } from "@/components/CNCEditor";
import { getTools, generateToolProgram } from "@/lib/cnc/tool-library";
import {
  type ToolDefinition,
  type ToolType,
  type OperationType,
  type ToolParams,
  type ControllerFormat,
  CONTROLLERS,
  TOOL_TYPE_LABELS,
  OPERATION_LABELS,
  TOOL_MATERIAL_LABELS,
  type ToolMaterial,
  COATING_LABELS,
  type ToolCoating,
} from "@/lib/cnc/types";
import {
  Wrench,
  Search,
  Copy,
  Check,
  ChevronRight,
  Gauge,
  Ruler,
  Zap,
  Plus,
  Save,
  Trash2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const toolTypes = Object.keys(TOOL_TYPE_LABELS) as ToolType[];
const operationTypes = Object.keys(OPERATION_LABELS) as OperationType[];
const toolMaterials = Object.keys(TOOL_MATERIAL_LABELS) as ToolMaterial[];
const coatings = Object.keys(COATING_LABELS) as unknown as ToolCoating[];

type ToolEntry = ToolDefinition & {
  isCustom?: boolean;
  customToolId?: Id<"userTools">;
};

type ToolDialogState = {
  tool: ToolEntry;
  isCustom: boolean;
  customToolId?: Id<"userTools">;
  operation: OperationType;
  feedRate: number;
  spindleSpeed: number;
  depthOfCut: number;
  stepover: number;
  peckDepth: number;
  coolant: ToolParams["coolant"];
  outputFormat: ControllerFormat;
  generatedCode: string;
  x: number;
  y: number;
  z: number;
  depth: number;
};

interface CustomToolForm {
  name: string;
  type: ToolType;
  number: number;
  diameter: number;
  flutes: number;
  length: number;
  lengthOfCut: number;
  shankDiameter: number;
  material: ToolMaterial;
  coating: ToolCoating;
  maxRPM: number;
  notes: string;
}

const defaultCustomForm: CustomToolForm = {
  name: "",
  type: "endmill-flat",
  number: 100,
  diameter: 10,
  flutes: 4,
  length: 75,
  lengthOfCut: 22,
  shankDiameter: 10,
  material: "carbide",
  coating: "tialn",
  maxRPM: 12000,
  notes: "",
};

function toolToForm(tool: ToolDefinition): CustomToolForm {
  return {
    name: tool.name,
    type: tool.type as ToolType,
    number: tool.number,
    diameter: tool.diameter,
    flutes: tool.flutes || 0,
    length: tool.length || 75,
    lengthOfCut: tool.lengthOfCut || 0,
    shankDiameter: tool.shankDiameter || tool.diameter,
    material: tool.material as ToolMaterial,
    coating: (tool.coating || "uncoated") as ToolCoating,
    maxRPM: tool.maxRPM || 12000,
    notes: tool.notes || "",
  };
}

export default function Tools() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ToolType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<CustomToolForm>(defaultCustomForm);

  const userTools = useQuery(api.tools.getUserTools);
  const createUserTool = useMutation(api.tools.createUserTool);
  const deleteUserTool = useMutation(api.tools.deleteUserTool);

  const libraryTools = useMemo(() => getTools(), []);

  // Merge library tools with user custom tools
  const allTools = useMemo((): ToolEntry[] => {
    const merged = [...libraryTools];
    if (userTools) {
      for (const ut of userTools) {
        const entry: ToolEntry = {
          id: ut._id,
          number: ut.number,
          name: ut.name,
          type: ut.type as ToolType,
          diameter: ut.diameter,
          flutes: ut.flutes ?? undefined,
          length: ut.length ?? undefined,
          lengthOfCut: ut.lengthOfCut ?? undefined,
          shankDiameter: ut.shankDiameter ?? undefined,
          material: ut.material as ToolMaterial,
          coating: (ut.coating || "uncoated") as ToolCoating,
          maxRPM: ut.maxRPM ?? undefined,
          defaultParams: ut.defaultParams || ({} as Record<string, ToolParams>),
          notes: ut.notes || undefined,
          isCustom: true,
          customToolId: ut._id as Id<"userTools">,
        };
        merged.push(entry);
      }
    }
    return merged;
  }, [libraryTools, userTools]);

  const filteredTools = useMemo(() => {
    return allTools.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allTools, search, typeFilter]);

  const [dialogState, setDialogState] = useState<ToolDialogState>({
    tool: libraryTools[0],
    isCustom: false,
    operation: "roughing",
    feedRate: 1200,
    spindleSpeed: 8000,
    depthOfCut: 1.5,
    stepover: 3,
    peckDepth: 1,
    coolant: "flood",
    outputFormat: "mitsubishi-m80",
    generatedCode: "",
    x: 50,
    y: 50,
    z: 0,
    depth: 10,
  });

  const openToolDialog = useCallback(
    (
      tool: ToolDefinition & {
        isCustom?: boolean;
        customToolId?: Id<"userTools">;
      },
    ) => {
      const defaultOp = Object.keys(tool.defaultParams)[0] as
        | OperationType
        | undefined;
      const defaults = defaultOp ? tool.defaultParams[defaultOp] : undefined;

      setDialogState({
        tool,
        isCustom: !!tool.isCustom,
        customToolId: tool.customToolId,
        operation: defaultOp || "roughing",
        feedRate: defaults?.feedRate || 1000,
        spindleSpeed: defaults?.spindleSpeed || 8000,
        depthOfCut: defaults?.depthOfCut || 1,
        stepover: defaults?.stepover || 2,
        peckDepth: defaults?.peckDepth || 1,
        coolant: defaults?.coolant || "flood",
        outputFormat: "mitsubishi-m80",
        generatedCode: "",
        x: 50,
        y: 50,
        z: 0,
        depth: 10,
      });
      setDialogOpen(true);
    },
    [],
  );

  const openCreateDialog = useCallback(() => {
    setEditForm({ ...defaultCustomForm, number: allTools.length + 1 });
    setEditDialogOpen(true);
  }, [allTools.length]);

  const openSaveAsDialog = useCallback((tool: ToolDefinition) => {
    setEditForm({ ...toolToForm(tool), name: `${tool.name} (Custom)` });
    setEditDialogOpen(true);
  }, []);

  const handleSaveCustomTool = useCallback(async () => {
    try {
      const args = {
        name: editForm.name,
        type: editForm.type,
        number: editForm.number,
        diameter: editForm.diameter,
        flutes: editForm.flutes || undefined,
        length: editForm.length || undefined,
        lengthOfCut: editForm.lengthOfCut || undefined,
        shankDiameter: editForm.shankDiameter || undefined,
        material: editForm.material,
        coating: editForm.coating,
        maxRPM: editForm.maxRPM || undefined,
        defaultParams: undefined as string | undefined,
        notes: editForm.notes || undefined,
      };

      await createUserTool(args);
      toast.success("Custom tool created");
      setEditDialogOpen(false);
    } catch {
      toast.error("Failed to create tool");
    }
  }, [editForm, createUserTool]);

  const handleDeleteUserTool = useCallback(
    async (toolId: Id<"userTools">) => {
      try {
        await deleteUserTool({ toolId });
        toast.success("Tool deleted");
        setDialogOpen(false);
      } catch {
        toast.error("Failed to delete tool");
      }
    },
    [deleteUserTool],
  );

  const generateCode = useCallback(() => {
    setDialogState((prev) => {
      const params: ToolParams = {
        feedRate: prev.feedRate,
        spindleSpeed: prev.spindleSpeed,
        depthOfCut: prev.depthOfCut,
        stepover: prev.stepover,
        peckDepth: prev.peckDepth,
        coolant: prev.coolant,
      };

      const code = generateToolProgram(
        prev.tool,
        prev.operation,
        params,
        prev.outputFormat,
        {
          programNumber: 1,
          x: prev.x,
          y: prev.y,
          z: prev.z,
          depth: prev.depth,
        },
      );

      return { ...prev, generatedCode: code };
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!dialogState.generatedCode) return;
    await navigator.clipboard.writeText(dialogState.generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [dialogState.generatedCode]);

  const handleOperationChange = useCallback((op: OperationType) => {
    setDialogState((prev) => {
      const defaults = prev.tool.defaultParams[op];
      return {
        ...prev,
        operation: op,
        feedRate: defaults?.feedRate || prev.feedRate,
        spindleSpeed: defaults?.spindleSpeed || prev.spindleSpeed,
        depthOfCut: defaults?.depthOfCut || prev.depthOfCut,
        stepover: defaults?.stepover || prev.stepover,
        peckDepth: defaults?.peckDepth || prev.peckDepth,
        coolant: defaults?.coolant || prev.coolant,
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-foreground">
                Tool Library
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {allTools.length} tools available - click any tool to generate a
                program
              </p>
            </div>
            <Button onClick={openCreateDialog} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Tool
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
        >
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ToolType | "all")}
          >
            <SelectTrigger className="w-full sm:w-44 h-8 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {toolTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {TOOL_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Tool grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          {filteredTools.map((tool, index) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.02 * index }}
              onClick={() => openToolDialog(tool)}
              className={cn(
                "group text-left border rounded-lg p-4 transition-all",
                tool.isCustom
                  ? "border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  : "border-border hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center",
                      tool.isCustom
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-zinc-100 dark:bg-zinc-800",
                    )}
                  >
                    {tool.isCustom ? (
                      <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground leading-tight flex items-center gap-1.5">
                      {tool.name}
                      {tool.isCustom && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      T{tool.number} / {TOOL_TYPE_LABELS[tool.type]}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <Separator className="my-2" />

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  Dia {tool.diameter}mm
                </span>
                {tool.flutes && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {tool.flutes}F
                  </span>
                )}
                <span className="ml-auto capitalize">
                  {tool.material.replace("-", " ")}
                </span>
              </div>
            </motion.button>
          ))}

          {filteredTools.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No tools found matching your search.
              </p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Tool dialog (G-code generation) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-medium flex items-center gap-2">
                  {dialogState.tool.name}
                  {dialogState.isCustom && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  T{dialogState.tool.number} / Dia {dialogState.tool.diameter}mm
                  / {dialogState.tool.material.replace("-", " ")}
                  {dialogState.tool.flutes
                    ? ` / ${dialogState.tool.flutes} flutes`
                    : ""}
                </DialogDescription>
              </div>
              {dialogState.isCustom && dialogState.customToolId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDeleteUserTool(dialogState.customToolId!)
                  }
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
              {!dialogState.isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    openSaveAsDialog(dialogState.tool);
                  }}
                  className="h-7 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save as Custom
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Operation type */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Operation
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {operationTypes.map((op) => {
                  const hasDefaults = !!dialogState.tool.defaultParams[op];
                  return (
                    <button
                      key={op}
                      onClick={() => handleOperationChange(op)}
                      disabled={!hasDefaults}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-md border transition-colors",
                        dialogState.operation === op
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900",
                        !hasDefaults && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      {OPERATION_LABELS[op]}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Feed Rate (mm/min)
                </Label>
                <Input
                  type="number"
                  value={dialogState.feedRate}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      feedRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Spindle Speed (RPM)
                </Label>
                <Input
                  type="number"
                  value={dialogState.spindleSpeed}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      spindleSpeed: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Depth of Cut (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={dialogState.depthOfCut}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      depthOfCut: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Stepover (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={dialogState.stepover}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      stepover: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Peck Depth (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={dialogState.peckDepth}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      peckDepth: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Coolant
                </Label>
                <Select
                  value={dialogState.coolant}
                  onValueChange={(v) =>
                    setDialogState((prev) => ({
                      ...prev,
                      coolant: v as ToolParams["coolant"],
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flood">Flood</SelectItem>
                    <SelectItem value="mist">Mist</SelectItem>
                    <SelectItem value="air">Air Blast</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Position & Depth */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  X Position
                </Label>
                <Input
                  type="number"
                  value={dialogState.x}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      x: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Y Position
                </Label>
                <Input
                  type="number"
                  value={dialogState.y}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      y: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Z Top
                </Label>
                <Input
                  type="number"
                  value={dialogState.z}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      z: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Total Depth (mm)
                </Label>
                <Input
                  type="number"
                  value={dialogState.depth}
                  onChange={(e) =>
                    setDialogState((prev) => ({
                      ...prev,
                      depth: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Output format */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Output Format
              </Label>
              <Select
                value={dialogState.outputFormat}
                onValueChange={(v) =>
                  setDialogState((prev) => ({
                    ...prev,
                    outputFormat: v as ControllerFormat,
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-64 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROLLERS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.manufacturer} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate button */}
            <Button onClick={generateCode} className="w-full h-8 text-xs">
              <Gauge className="w-3.5 h-3.5 mr-1.5" />
              Generate Program
            </Button>

            {/* Generated code */}
            {dialogState.generatedCode && (
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Generated Program
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs text-muted-foreground hover:text-foreground h-6"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <CNCEditor
                  value={dialogState.generatedCode}
                  readOnly
                  minHeight="200px"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit custom tool dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              Create Custom Tool
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new tool for your personal tool library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tool Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-8 text-sm"
                placeholder="e.g. 8mm Custom End Mill"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) =>
                    setEditForm((prev) => ({ ...prev, type: v as ToolType }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toolTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TOOL_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Tool Number
                </Label>
                <Input
                  type="number"
                  value={editForm.number}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      number: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Diameter (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.diameter}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      diameter: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Flutes</Label>
                <Input
                  type="number"
                  value={editForm.flutes}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      flutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Length (mm)
                </Label>
                <Input
                  type="number"
                  value={editForm.length}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      length: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Length of Cut (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.lengthOfCut}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      lengthOfCut: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Shank Diameter (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.shankDiameter}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      shankDiameter: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max RPM</Label>
                <Input
                  type="number"
                  value={editForm.maxRPM}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      maxRPM: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Material
                </Label>
                <Select
                  value={editForm.material}
                  onValueChange={(v) =>
                    setEditForm((prev) => ({
                      ...prev,
                      material: v as ToolMaterial,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toolMaterials.map((m) => (
                      <SelectItem key={m} value={m}>
                        {TOOL_MATERIAL_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Coating</Label>
                <Select
                  value={editForm.coating}
                  onValueChange={(v) =>
                    setEditForm((prev) => ({
                      ...prev,
                      coating: v as ToolCoating,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coatings.map((c) => (
                      <SelectItem key={c} value={c}>
                        {COATING_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="text-sm min-h-[60px]"
                placeholder="Optional notes about this tool"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDialogOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomTool}
              className="h-8 text-xs gap-1.5"
              disabled={!editForm.name.trim()}
            >
              <Save className="w-3.5 h-3.5" />
              Save Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
