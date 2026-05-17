import React, { useMemo, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { FieldTitle, useGetList, useInput, useRecordContext } from "ra-core";
import type { InputProps } from "ra-core";
import { Plus, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
    Create,
    DataTable,
    Edit,
    List,
    Show,
    SimpleForm,
    SimpleShowLayout,
    TextField,
    TextInput,
} from "@/components";
import { FormControl, FormError, FormField, FormLabel } from "@/components/form";
import { InputHelperText } from "@/components/input-helper-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type Ingredient = { name: string; quantity: string; unit: string };

const UNITS = [
    { value: "g",          label: "g" },
    { value: "kg",         label: "kg" },
    { value: "ml",         label: "ml" },
    { value: "l",          label: "l" },
    { value: "pz",         label: "pz" },
    { value: "cucchiaio",  label: "cucchiaio" },
    { value: "cucchiaino", label: "cucchiaino" },
    { value: "tazza",      label: "tazza" },
    { value: "q.b.",       label: "q.b." },
];

// ---------------------------------------------------------------------------
// MarkdownInput / MarkdownField
// ---------------------------------------------------------------------------

const MarkdownInput = (props: InputProps) => {
    const { id, field, isRequired } = useInput({ ...props, defaultValue: "" });
    const { resolvedTheme } = useTheme();
    const colorMode = resolvedTheme === "dark" ? "dark" : "light";

    return (
        <FormField id={id} name={field.name}>
            {props.label !== false && (
                <FormLabel>
                    <FieldTitle label={props.label} source={props.source} isRequired={isRequired} />
                </FormLabel>
            )}
            <div data-color-mode={colorMode}>
                <MDEditor
                    value={field.value ?? ""}
                    onChange={(val) => field.onChange(val ?? "")}
                    height={300}
                />
            </div>
            <InputHelperText helperText={props.helperText} />
            <FormError />
        </FormField>
    );
};

const MarkdownField = ({ source = "instructions" }: { source?: string }) => {
    const record = useRecordContext();
    const value: string = record?.[source] ?? "";
    const { resolvedTheme } = useTheme();
    const colorMode = resolvedTheme === "dark" ? "dark" : "light";

    if (!value) return null;
    return (
        <div data-color-mode={colorMode} className="prose prose-sm max-w-none">
            <MDEditor.Markdown source={value} />
        </div>
    );
};

// ---------------------------------------------------------------------------
// IngredientsInput
// ---------------------------------------------------------------------------

type IngredientsInputProps = Omit<InputProps, "source"> &
    Partial<Pick<InputProps, "source">> & { className?: string };

const UnitSelect = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) => (
    <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Unità…" />
        </SelectTrigger>
        <SelectContent>
            {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                    {u.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const IngredientsInput = (props: IngredientsInputProps) => {
    const source = props.source ?? "ingredients";
    const { id, field, isRequired } = useInput({ ...props, source, defaultValue: [] });
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newQty, setNewQty] = useState("");
    const [newUnit, setNewUnit] = useState("");

    const { data: aliments = [] } = useGetList("ingredients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const usedNames: string[] = (field.value ?? []).map((i: Ingredient) => i.name);

    const suggestions = useMemo(
        () => aliments.map((r) => r.name as string).filter((n) => n && !usedNames.includes(n)),
        [aliments, usedNames],
    );

    const filtered = newName
        ? suggestions.filter((n) => n.toLowerCase().includes(newName.toLowerCase()))
        : suggestions;

    const addIngredient = (name = newName) => {
        const n = name.trim();
        if (!n || usedNames.includes(n)) return;
        field.onChange([...(field.value ?? []), { name: n, quantity: newQty.trim(), unit: newUnit }]);
        setNewName("");
        setNewQty("");
        setNewUnit("");
        setOpen(false);
    };

    const removeIngredient = (index: number) => {
        field.onChange((field.value ?? []).filter((_: Ingredient, i: number) => i !== index));
    };

    const updateField = (index: number, key: keyof Ingredient, val: string) => {
        const updated = [...(field.value ?? [])] as Ingredient[];
        updated[index] = { ...updated[index], [key]: val };
        field.onChange(updated);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" && newName.trim()) {
            e.preventDefault();
            addIngredient();
        }
        if (e.key === "Escape") {
            nameInputRef.current?.blur();
            setOpen(false);
        }
    };

    return (
        <FormField className={props.className} id={id} name={field.name}>
            {props.label !== false && (
                <FormLabel>
                    <FieldTitle label={props.label} source={source} isRequired={isRequired} />
                </FormLabel>
            )}
            <FormControl>
                <div className="space-y-2">
                    {/* existing ingredients */}
                    {(field.value ?? []).length > 0 && (
                        <div className="rounded-md border divide-y">
                            {(field.value as Ingredient[]).map((ing, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="flex-1 font-medium">{ing.name}</span>
                                    <Input
                                        value={ing.quantity}
                                        onChange={(e) => updateField(i, "quantity", e.target.value)}
                                        placeholder="Quantità…"
                                        className="h-7 w-20 py-0 text-xs"
                                    />
                                    <UnitSelect
                                        value={ing.unit}
                                        onChange={(v) => updateField(i, "unit", v)}
                                    />
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => removeIngredient(i)}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* add row */}
                    <div className="flex gap-2">
                        <Command
                            onKeyDown={handleKeyDown}
                            className="overflow-visible bg-transparent flex-1"
                        >
                            <div className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm transition-all ring-offset-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                                <CommandPrimitive.Input
                                    ref={nameInputRef}
                                    value={newName}
                                    onValueChange={setNewName}
                                    onFocus={() => setOpen(true)}
                                    onBlur={() => setOpen(false)}
                                    placeholder="Cerca alimento…"
                                    className="bg-transparent outline-none placeholder:text-muted-foreground w-full"
                                />
                            </div>
                            <div className="relative">
                                <CommandList>
                                    {open && filtered.length > 0 && (
                                        <div className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                                            <CommandGroup className="h-full overflow-auto">
                                                {filtered.map((name) => (
                                                    <CommandItem
                                                        key={name}
                                                        value={name}
                                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        onSelect={() => { setNewName(name); setOpen(false); }}
                                                        className="cursor-pointer"
                                                    >
                                                        {name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </div>
                                    )}
                                </CommandList>
                            </div>
                        </Command>

                        <Input
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            placeholder="Quantità…"
                            className="w-20"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); addIngredient(); }
                            }}
                        />

                        <UnitSelect value={newUnit} onChange={setNewUnit} />

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!newName.trim()}
                            onClick={() => addIngredient()}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </FormControl>
            <InputHelperText helperText={props.helperText} />
            <FormError />
        </FormField>
    );
};

// ---------------------------------------------------------------------------
// Field display components
// ---------------------------------------------------------------------------

const formatAmount = (ing: Ingredient) => {
    const parts = [ing.quantity, ing.unit].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
};

const IngredientsField = () => {
    const record = useRecordContext();
    const ingredients: Ingredient[] = record?.ingredients ?? [];
    if (!ingredients.length) return null;
    return (
        <div className="space-y-1">
            {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{ing.name}</Badge>
                    {formatAmount(ing) && (
                        <span className="text-muted-foreground">{formatAmount(ing)}</span>
                    )}
                </div>
            ))}
        </div>
    );
};

const IngredientsListField = () => {
    const record = useRecordContext();
    const ingredients: Ingredient[] = record?.ingredients ?? [];
    if (!ingredients.length) return null;
    return (
        <div className="flex flex-wrap gap-1">
            {ingredients.map((ing, i) => (
                <Badge key={i} variant="outline">{ing.name}</Badge>
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// CRUD components
// ---------------------------------------------------------------------------

const RecipeForm = () => (
    <SimpleForm>
        <TextInput source="name" required />
        <IngredientsInput source="ingredients" />
        <MarkdownInput source="instructions" />
    </SimpleForm>
);

export const RecipeList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="name" />
            <DataTable.Col source="ingredients">
                <IngredientsListField />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const RecipeShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="name" />
            <IngredientsField />
            <MarkdownField source="instructions" />
        </SimpleShowLayout>
    </Show>
);

export const RecipeEdit = () => (
    <Edit>
        <RecipeForm />
    </Edit>
);

export const RecipeCreate = () => (
    <Create>
        <RecipeForm />
    </Create>
);
