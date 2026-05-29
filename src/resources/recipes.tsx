import React, { useMemo, useRef, useState } from "react";
import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    linkPlugin,
    linkDialogPlugin,
    markdownShortcutPlugin,
    toolbarPlugin,
    UndoRedo,
    Separator,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    ListsToggle,
    CreateLink,
    InsertThematicBreak,
} from "@mdxeditor/editor";
import { FieldTitle, useCreate, useGetList, useInput, useRecordContext, useRedirect, useResourceContext } from "ra-core";
import type { InputProps } from "ra-core";
import { Copy, ExternalLink, Plus, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
    Create,
    DataTable,
    Edit,
    List,
    SearchInput,
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
import { Checkbox } from "@/components/ui/checkbox";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = [
    { id: "mon", name: "Lunedì" },
    { id: "tue", name: "Martedì" },
    { id: "wed", name: "Mercoledì" },
    { id: "thu", name: "Giovedì" },
    { id: "fri", name: "Venerdì" },
    { id: "sat", name: "Sabato" },
    { id: "sun", name: "Domenica" },
] as const;

const MEALS = [
    { id: "breakfast",        name: "Colazione" },
    { id: "morning_snack",   name: "Spuntino mattina" },
    { id: "lunch",            name: "Pranzo" },
    { id: "afternoon_snack", name: "Merenda" },
    { id: "dinner",           name: "Cena" },
] as const;

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
// ScheduleInput — griglia giorno × pasto, per utente
// ---------------------------------------------------------------------------

type Schedule = Record<string, string[]>;
type UserSchedules = Record<string, Schedule>;

const ScheduleGrid = ({
    scheduleId,
    schedule,
    onToggle,
}: {
    scheduleId: string;
    schedule: Schedule;
    onToggle: (dayId: string, mealId: string) => void;
}) => (
    <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b">
                    <th className="py-2 pl-3 pr-4 text-left font-normal text-muted-foreground w-28" />
                    {MEALS.map((meal) => (
                        <th key={meal.id} className="py-2 px-3 text-center font-normal text-muted-foreground whitespace-nowrap">
                            {meal.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {DAYS.map((day) => (
                    <tr key={day.id} className="border-t first:border-t-0">
                        <td className="py-2 pl-3 pr-4 font-medium">{day.name}</td>
                        {MEALS.map((meal) => (
                            <td key={meal.id} className="py-2 px-3 text-center">
                                <Checkbox
                                    id={`${scheduleId}-${day.id}-${meal.id}`}
                                    checked={(schedule[day.id] ?? []).includes(meal.id)}
                                    onCheckedChange={() => onToggle(day.id, meal.id)}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ScheduleInput = ({
    source = "schedule",
    label,
    helperText,
}: {
    source?: string;
    label?: string | false;
    helperText?: string;
}) => {
    const { id, field, isRequired } = useInput({ source, defaultValue: {} });
    const resource = useResourceContext();
    const userSchedules: UserSchedules = field.value ?? {};

    const { data: users = [] } = useGetList("users", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const effectiveUserId = selectedUserId ?? (users.length > 0 ? String(users[0].id) : null);

    const toggle = (dayId: string, mealId: string) => {
        if (!effectiveUserId) return;
        const schedule: Schedule = userSchedules[effectiveUserId] ?? {};
        const dayMeals: string[] = schedule[dayId] ?? [];
        const newDayMeals = dayMeals.includes(mealId)
            ? dayMeals.filter((m) => m !== mealId)
            : [...dayMeals, mealId];

        const newSchedule = { ...schedule };
        if (newDayMeals.length === 0) {
            delete newSchedule[dayId];
        } else {
            newSchedule[dayId] = newDayMeals;
        }

        const newUserSchedules = { ...userSchedules };
        if (Object.keys(newSchedule).length === 0) {
            delete newUserSchedules[effectiveUserId];
        } else {
            newUserSchedules[effectiveUserId] = newSchedule;
        }
        field.onChange(newUserSchedules);
    };

    return (
        <FormField id={id} name={field.name}>
            {label !== false && (
                <FormLabel>
                    <FieldTitle label={label} source={source} resource={resource} isRequired={isRequired} />
                </FormLabel>
            )}
            <FormControl>
                <div className="space-y-3">
                    {users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nessun utente disponibile. Crea prima un utente per assegnare la programmazione.
                        </p>
                    ) : (
                        <>
                            <Select
                                value={effectiveUserId ?? undefined}
                                onValueChange={setSelectedUserId}
                            >
                                <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Seleziona utente…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {effectiveUserId && (
                                <ScheduleGrid
                                    scheduleId={`${id}-${effectiveUserId}`}
                                    schedule={userSchedules[effectiveUserId] ?? {}}
                                    onToggle={toggle}
                                />
                            )}
                        </>
                    )}
                </div>
            </FormControl>
            <InputHelperText helperText={helperText} />
            <FormError />
        </FormField>
    );
};

// ---------------------------------------------------------------------------
// MarkdownInput / MarkdownField  (MDXEditor rich-text)
// ---------------------------------------------------------------------------

const EDITOR_PLUGINS = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    markdownShortcutPlugin(),
    toolbarPlugin({
        toolbarContents: () => (
            <>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertThematicBreak />
            </>
        ),
    }),
];

const READ_ONLY_PLUGINS = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
];

const MarkdownInput = (props: InputProps) => {
    const { id, field, isRequired } = useInput({ ...props, defaultValue: "" });
    const { resolvedTheme } = useTheme();
    const darkClass = resolvedTheme === "dark" ? "dark-theme dark" : "";

    return (
        <FormField id={id} name={field.name}>
            {props.label !== false && (
                <FormLabel>
                    <FieldTitle label={props.label} source={props.source} isRequired={isRequired} />
                </FormLabel>
            )}
            <div className="rounded-md border overflow-hidden">
                <MDXEditor
                    key={id}
                    markdown={field.value ?? ""}
                    onChange={(val) => field.onChange(val)}
                    className={darkClass}
                    plugins={EDITOR_PLUGINS}
                    contentEditableClassName="prose prose-sm dark:prose-invert max-w-none min-h-48 px-4 py-3 focus:outline-none"
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
    const darkClass = resolvedTheme === "dark" ? "dark-theme dark" : "";

    if (!value) return null;
    return (
        <MDXEditor
            markdown={value}
            readOnly
            className={darkClass}
            plugins={READ_ONLY_PLUGINS}
        />
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

const ScheduleDayRows = ({ schedule }: { schedule: Schedule }) => {
    const entries = DAYS.flatMap((day) => {
        const mealIds: string[] = schedule[day.id] ?? [];
        if (!mealIds.length) return [];
        const meals = MEALS.filter((m) => mealIds.includes(m.id)).map((m) => m.name);
        return [{ day: day.name, meals }];
    });
    if (!entries.length) return null;
    return (
        <div className="space-y-1">
            {entries.map((entry) => (
                <div key={entry.day} className="flex items-start gap-3 text-sm">
                    <span className="w-24 shrink-0 font-medium">{entry.day}</span>
                    <div className="flex flex-wrap gap-1">
                        {entry.meals.map((meal) => (
                            <Badge key={meal} variant="secondary">{meal}</Badge>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ScheduleField = () => {
    const record = useRecordContext();
    const userSchedules: UserSchedules = record?.schedule ?? {};

    const { data: users = [] } = useGetList("users", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const userMap = Object.fromEntries(users.map((u) => [String(u.id), u.name as string]));
    const entries = Object.entries(userSchedules).filter(([, s]) =>
        DAYS.some((d) => (s[d.id] ?? []).length > 0)
    );

    if (!entries.length) return null;

    return (
        <div className="space-y-4">
            {entries.map(([userId, schedule]) => (
                <div key={userId} className="space-y-1">
                    <p className="text-sm font-semibold">{userMap[userId] ?? userId}</p>
                    <ScheduleDayRows schedule={schedule} />
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
// CloneRecipeButton
// ---------------------------------------------------------------------------

const CloneRecipeButton = () => {
    const record = useRecordContext();
    const [create, { isPending }] = useCreate();
    const redirect = useRedirect();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!record) return;
        const { id, ...data } = record;
        void id;
        create(
            "recipes",
            { data: { ...data, name: `Copia di ${data.name as string}` } },
            { onSuccess: (created) => redirect("edit", "recipes", created.id) },
        );
    };

    return (
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
            <Copy className="h-4 w-4" />
            Duplica
        </Button>
    );
};

// ---------------------------------------------------------------------------
// CRUD components
// ---------------------------------------------------------------------------

const LinkField = () => {
    const record = useRecordContext();
    const url = record?.link as string | undefined;
    if (!url) return null;
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
            <ExternalLink className="h-3.5 w-3.5" />
            {url}
        </a>
    );
};

const RecipeForm = () => (
    <SimpleForm>
        <TextInput source="name" required />
        <TextInput source="link" />
        <IngredientsInput source="ingredients" />
        <ScheduleInput source="schedule" />
        <MarkdownInput source="instructions" />
    </SimpleForm>
);

const recipeFilters = [
    <SearchInput source="name@ilike" alwaysOn placeholder="Cerca per nome…" parse={(v: string) => (v ? `*${v}*` : "")} />,
    <SearchInput source="ingredient_name" alwaysOn placeholder="Cerca per ingrediente…" />,
];

export const RecipeList = () => (
    <List filters={recipeFilters}>
        <DataTable>
            <DataTable.Col source="name" />
            <DataTable.Col source="ingredients">
                <IngredientsListField />
            </DataTable.Col>
            <DataTable.Col>
                <CloneRecipeButton />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const RecipeShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="name" />
            <LinkField />
            <IngredientsField />
            <ScheduleField />
            <MarkdownField source="instructions" />
            <CloneRecipeButton />
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
