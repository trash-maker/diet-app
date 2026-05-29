import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
    FieldTitle,
    useGetList,
    useGetOne,
    useInput,
    useRecordContext,
    useResourceContext,
    useStore,
    useUpdate,
} from "ra-core";
import {
    Create,
    DataTable,
    Edit,
    List,
    Show,
    SimpleForm,
    SimpleShowLayout,
} from "@/components";
import { FormControl, FormError, FormField, FormLabel } from "@/components/form";
import { InputHelperText } from "@/components/input-helper-text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Printer, ShoppingCart } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = [
    { id: "mon", label: "Lunedì",    short: "Lun" },
    { id: "tue", label: "Martedì",   short: "Mar" },
    { id: "wed", label: "Mercoledì", short: "Mer" },
    { id: "thu", label: "Giovedì",   short: "Gio" },
    { id: "fri", label: "Venerdì",   short: "Ven" },
    { id: "sat", label: "Sabato",    short: "Sab" },
    { id: "sun", label: "Domenica",  short: "Dom" },
] as const;

const MEALS = [
    { id: "breakfast",        name: "Colazione" },
    { id: "morning_snack",   name: "Spuntino" },
    { id: "lunch",            name: "Pranzo" },
    { id: "afternoon_snack", name: "Merenda" },
    { id: "dinner",           name: "Cena" },
] as const;

const USERS_PER_PAGE = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotValue = { recipeId: string; note: string };
// { [userId]: { [dayId]: { [mealId]: SlotValue } } }
type MealPlanSlots = Record<string, Record<string, Record<string, SlotValue>>>;
type UserSchedules = Record<string, Record<string, string[]>>;

type PickerState = {
    userId: string;
    mealId: string;
    title: string;
    validRecipes: { id: string; name: string }[];
};

type RecipeIngredient = { name: string; quantity: string; unit: string };

type RecipeContrib = { recipeId: string; recipeName: string; totalNum: number; extras: string[] };

type AggItem = { name: string; unit: string; totalNum: number; extras: string[]; byRecipe: RecipeContrib[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMonday(dateStr: string): string {
    if (!dateStr) return dateStr;
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    date.setDate(date.getDate() + diff);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function formatWeekRange(mondayStr: string): string {
    if (!mondayStr) return "";
    const parts = mondayStr.split("-").map(Number);
    if (parts.length !== 3) return mondayStr;
    const [y, m, d] = parts;
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);
    const short = (dt: Date) =>
        dt.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
    const full = (dt: Date) =>
        dt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    return `${short(mon)} – ${full(sun)}`;
}

// Counts recipe occurrences across all slots, then aggregates ingredient quantities.
function buildShoppingList(
    slots: MealPlanSlots,
    recipeMap: Record<string, { name?: string; ingredients?: RecipeIngredient[] }>,
): Record<string, AggItem> {
    const recipeCounts: Record<string, number> = {};
    for (const daySlots of Object.values(slots)) {
        for (const mealSlots of Object.values(daySlots)) {
            for (const sv of Object.values(mealSlots)) {
                if (sv.recipeId) {
                    recipeCounts[sv.recipeId] = (recipeCounts[sv.recipeId] ?? 0) + 1;
                }
            }
        }
    }

    const totals: Record<string, AggItem> = {};
    for (const [recipeId, count] of Object.entries(recipeCounts)) {
        const recipe = recipeMap[recipeId];
        if (!recipe) continue;
        const recipeName = recipe.name ?? recipeId;
        for (const ing of recipe.ingredients ?? []) {
            const key = `${ing.name}|||${ing.unit}`;
            if (!totals[key]) totals[key] = { name: ing.name, unit: ing.unit, totalNum: 0, extras: [], byRecipe: [] };
            const qty = parseFloat(ing.quantity);
            const contribNum = !isNaN(qty) ? qty * count : 0;
            const contribExtras: string[] = isNaN(qty) && ing.quantity ? Array(count).fill(ing.quantity) : [];
            totals[key].totalNum += contribNum;
            for (const e of contribExtras) totals[key].extras.push(e);
            const existing = totals[key].byRecipe.find((r) => r.recipeId === recipeId);
            if (existing) {
                existing.totalNum += contribNum;
                existing.extras.push(...contribExtras);
            } else {
                totals[key].byRecipe.push({ recipeId, recipeName, totalNum: contribNum, extras: contribExtras });
            }
        }
    }
    return totals;
}

function formatQty(num: number, unit: string, extras: string[]): string {
    const parts: string[] = [];
    if (num > 0) {
        const s = num % 1 === 0 ? String(num) : num.toFixed(2);
        parts.push(unit ? `${s} ${unit}` : s);
    }
    const uniqueExtras = [...new Set(extras)];
    if (uniqueExtras.length > 0) parts.push(uniqueExtras.join(", "));
    return parts.join(" + ") || "—";
}


// ---------------------------------------------------------------------------
// WeekInput
// ---------------------------------------------------------------------------

const WeekInput = ({
    source = "weekStart",
    label,
    helperText,
}: {
    source?: string;
    label?: string | false;
    helperText?: string;
}) => {
    const { id, field, isRequired } = useInput({ source, defaultValue: "" });
    const resource = useResourceContext();

    return (
        <FormField id={id} name={field.name}>
            {label !== false && (
                <FormLabel>
                    <FieldTitle
                        label={label}
                        source={source}
                        resource={resource}
                        isRequired={isRequired}
                    />
                </FormLabel>
            )}
            <FormControl>
                <input
                    type="date"
                    id={id}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(toMonday(e.target.value))}
                    className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
            </FormControl>
            {field.value && (
                <p className="text-xs text-muted-foreground mt-1">
                    {formatWeekRange(field.value)}
                </p>
            )}
            <InputHelperText helperText={helperText} />
            <FormError />
        </FormField>
    );
};

// ---------------------------------------------------------------------------
// WeekField (display)
// ---------------------------------------------------------------------------

const WeekField = ({ source = "weekStart" }: { source?: string }) => {
    const record = useRecordContext();
    return <span>{formatWeekRange((record?.[source] as string) ?? "")}</span>;
};

// ---------------------------------------------------------------------------
// SlotsInput
// ---------------------------------------------------------------------------

const SlotsInput = ({
    source = "slots",
    label,
    helperText,
}: {
    source?: string;
    label?: string | false;
    helperText?: string;
}) => {
    const { id, field, isRequired } = useInput({ source, defaultValue: {} });
    const resource = useResourceContext();
    const slots: MealPlanSlots = (field.value as MealPlanSlots) ?? {};

    const { data: users = [] } = useGetList("users", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const { data: recipes = [] } = useGetList("recipes", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const [selectedDay, setSelectedDay] = useState<string>(DAYS[0].id);
    const [userPage, setUserPage] = useState(0);
    const [picker, setPicker] = useState<PickerState | null>(null);
    const [search, setSearch] = useState("");

    const recipeMap = useMemo(
        () => Object.fromEntries(recipes.map((r) => [String(r.id), r.name as string])),
        [recipes],
    );

    const getValidRecipes = (userId: string, dayId: string, mealId: string) =>
        recipes
            .filter((r) => {
                const s = r.schedule as UserSchedules | undefined;
                return s?.[userId]?.[dayId]?.includes(mealId);
            })
            .map((r) => ({ id: String(r.id), name: r.name as string }));

    // Merges a partial update into a slot; cleans up when both recipeId and note are empty.
    const setSlotValue = (
        userId: string,
        dayId: string,
        mealId: string,
        update: Partial<SlotValue>,
    ) => {
        const current = slots[userId]?.[dayId]?.[mealId] ?? { recipeId: "", note: "" };
        const next = { ...current, ...update };

        if (!next.recipeId && !next.note) {
            const dayMeals = { ...slots[userId]?.[dayId] };
            delete dayMeals[mealId];
            const userDays = { ...slots[userId] };
            if (Object.keys(dayMeals).length === 0) delete userDays[dayId];
            else userDays[dayId] = dayMeals;
            const newSlots = { ...slots };
            if (Object.keys(userDays).length === 0) delete newSlots[userId];
            else newSlots[userId] = userDays;
            field.onChange(newSlots);
        } else {
            field.onChange({
                ...slots,
                [userId]: {
                    ...slots[userId],
                    [dayId]: { ...slots[userId]?.[dayId], [mealId]: next },
                },
            });
        }
    };

    const openPicker = (userId: string, meal: (typeof MEALS)[number]) => {
        const dayLabel = DAYS.find((d) => d.id === selectedDay)?.label ?? selectedDay;
        setSearch("");
        setPicker({
            userId,
            mealId: meal.id,
            title: `${meal.name} — ${dayLabel}`,
            validRecipes: getValidRecipes(userId, selectedDay, meal.id),
        });
    };

    const filteredRecipes = picker
        ? picker.validRecipes.filter((r) =>
              r.name.toLowerCase().includes(search.toLowerCase()),
          )
        : [];

    const selectedDayLabel = DAYS.find((d) => d.id === selectedDay)?.label ?? selectedDay;
    const totalUserPages = Math.ceil(users.length / USERS_PER_PAGE);
    const pagedUsers = users.slice(userPage * USERS_PER_PAGE, (userPage + 1) * USERS_PER_PAGE);

    return (
        <FormField id={id} name={field.name}>
            {label !== false && (
                <FormLabel>
                    <FieldTitle
                        label={label}
                        source={source}
                        resource={resource}
                        isRequired={isRequired}
                    />
                </FormLabel>
            )}
            <FormControl>
                <div className="space-y-3">
                    {users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nessun utente disponibile.
                        </p>
                    ) : (
                        <>
                            {/* Day selector + user pagination */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex flex-wrap gap-1">
                                    {DAYS.map((day) => (
                                        <Button
                                            key={day.id}
                                            type="button"
                                            variant={selectedDay === day.id ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedDay(day.id)}
                                        >
                                            {day.short}
                                        </Button>
                                    ))}
                                </div>
                                {totalUserPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={userPage === 0}
                                            onClick={() => setUserPage((p) => p - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {userPage + 1} / {totalUserPages}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={userPage >= totalUserPages - 1}
                                            onClick={() => setUserPage((p) => p + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Grid: rows = meals, cols = users */}
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 pl-3 pr-4 text-left font-semibold w-32">
                                                {selectedDayLabel}
                                            </th>
                                            {pagedUsers.map((user) => (
                                                <th
                                                    key={String(user.id)}
                                                    className="py-2 px-3 text-center font-normal text-muted-foreground whitespace-nowrap"
                                                >
                                                    {user.name as string}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MEALS.map((meal) => (
                                            <tr key={meal.id} className="border-t first:border-t-0">
                                                <td className="py-2 pl-3 pr-4 font-medium align-top whitespace-nowrap">
                                                    {meal.name}
                                                </td>
                                                {pagedUsers.map((user) => {
                                                    const userId = String(user.id);
                                                    const slotVal =
                                                        slots[userId]?.[selectedDay]?.[meal.id];
                                                    const hasRecipe = Boolean(slotVal?.recipeId);
                                                    const recipeName = hasRecipe
                                                        ? (recipeMap[slotVal!.recipeId] ?? "?")
                                                        : null;
                                                    const validCount = getValidRecipes(
                                                        userId,
                                                        selectedDay,
                                                        meal.id,
                                                    ).length;

                                                    return (
                                                        <td
                                                            key={userId}
                                                            className="py-2 px-2 min-w-44 align-top"
                                                        >
                                                            <div className="flex flex-col gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={validCount === 0}
                                                                    onClick={() => openPicker(userId, meal)}
                                                                    className={cn(
                                                                        "w-full justify-start text-xs font-normal truncate",
                                                                        !hasRecipe &&
                                                                            "text-muted-foreground",
                                                                    )}
                                                                >
                                                                    {recipeName ??
                                                                        (validCount > 0
                                                                            ? "Seleziona…"
                                                                            : "—")}
                                                                </Button>
                                                                <Input
                                                                    value={slotVal?.note ?? ""}
                                                                    onChange={(e) =>
                                                                        setSlotValue(
                                                                            userId,
                                                                            selectedDay,
                                                                            meal.id,
                                                                            { note: e.target.value },
                                                                        )
                                                                    }
                                                                    placeholder="Nota…"
                                                                    className="h-7 text-xs"
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </FormControl>
            <InputHelperText helperText={helperText} />
            <FormError />

            {/* Recipe picker dialog */}
            <Dialog
                open={picker !== null}
                onOpenChange={(open) => {
                    if (!open) setPicker(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{picker?.title}</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cerca ricetta…"
                        autoFocus
                    />
                    <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
                        {/* Clear option */}
                        <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                            onClick={() => {
                                if (picker)
                                    setSlotValue(picker.userId, selectedDay, picker.mealId, {
                                        recipeId: "",
                                    });
                                setPicker(null);
                            }}
                        >
                            — Nessuna ricetta
                        </button>

                        {filteredRecipes.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                onClick={() => {
                                    if (picker)
                                        setSlotValue(picker.userId, selectedDay, picker.mealId, {
                                            recipeId: r.id,
                                        });
                                    setPicker(null);
                                }}
                            >
                                {r.name}
                            </button>
                        ))}

                        {picker?.validRecipes.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                Nessuna ricetta disponibile per questo slot.
                            </p>
                        )}
                        {(picker?.validRecipes.length ?? 0) > 0 &&
                            filteredRecipes.length === 0 &&
                            search && (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                    Nessun risultato per "{search}".
                                </p>
                            )}
                    </div>
                </DialogContent>
            </Dialog>
        </FormField>
    );
};

// ---------------------------------------------------------------------------
// SlotsField (display)
// ---------------------------------------------------------------------------

const SlotsField = () => {
    const record = useRecordContext();
    const slots: MealPlanSlots = (record?.slots as MealPlanSlots) ?? {};

    const { data: users = [] } = useGetList("users", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const { data: recipes = [] } = useGetList("recipes", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const [selectedDay, setSelectedDay] = useState<string>(DAYS[0].id);
    const [userPage, setUserPage] = useState(0);

    const recipeMap = useMemo(
        () =>
            Object.fromEntries(
                recipes.map((r) => [
                    String(r.id),
                    { name: r.name as string, link: r.link as string | undefined },
                ]),
            ),
        [recipes],
    );

    const selectedDayLabel = DAYS.find((d) => d.id === selectedDay)?.label ?? selectedDay;
    const totalUserPages = Math.ceil(users.length / USERS_PER_PAGE);
    const pagedUsers = users.slice(userPage * USERS_PER_PAGE, (userPage + 1) * USERS_PER_PAGE);

    if (users.length === 0)
        return (
            <p className="text-sm text-muted-foreground">Nessun utente disponibile.</p>
        );

    return (
        <div className="space-y-3">
            {/* Day selector + user pagination */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap gap-1">
                    {DAYS.map((day) => (
                        <Button
                            key={day.id}
                            variant={selectedDay === day.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedDay(day.id)}
                        >
                            {day.short}
                        </Button>
                    ))}
                </div>
                {totalUserPages > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={userPage === 0}
                            onClick={() => setUserPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {userPage + 1} / {totalUserPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={userPage >= totalUserPages - 1}
                            onClick={() => setUserPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Read-only grid: rows = meals, cols = users */}
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pl-3 pr-4 text-left font-semibold w-32">
                                {selectedDayLabel}
                            </th>
                            {pagedUsers.map((user) => (
                                <th
                                    key={String(user.id)}
                                    className="py-2 px-3 text-center font-normal text-muted-foreground whitespace-nowrap"
                                >
                                    {user.name as string}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MEALS.map((meal) => (
                            <tr key={meal.id} className="border-t first:border-t-0">
                                <td className="py-2 pl-3 pr-4 font-medium align-top whitespace-nowrap">
                                    {meal.name}
                                </td>
                                {pagedUsers.map((user) => {
                                    const userId = String(user.id);
                                    const sv = slots[userId]?.[selectedDay]?.[meal.id];
                                    const recipeEntry = sv?.recipeId ? recipeMap[sv.recipeId] : null;
                                    const recipeName = recipeEntry?.name ?? (sv?.recipeId ? sv.recipeId : null);
                                    const recipeLink = recipeEntry?.link;
                                    return (
                                        <td
                                            key={userId}
                                            className="py-2 px-3 min-w-44 align-top"
                                        >
                                            {recipeName ? (
                                                <div className="space-y-0.5">
                                                    {recipeLink ? (
                                                        <a
                                                            href={recipeLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium hover:underline flex items-center gap-1"
                                                        >
                                                            {recipeName}
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                        </a>
                                                    ) : (
                                                        <p className="font-medium">{recipeName}</p>
                                                    )}
                                                    {sv?.note && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {sv.note}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// ShoppingListButton (used in show page)
// ---------------------------------------------------------------------------

const ShoppingListButton = () => {
    const record = useRecordContext();
    const navigate = useNavigate();
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/meal-plans/${record?.id}/shopping-list`)}
        >
            <ShoppingCart className="h-4 w-4" />
            Lista della spesa
        </Button>
    );
};

// ---------------------------------------------------------------------------
// PrintMealPlanButton (used in show page)
// ---------------------------------------------------------------------------

const PrintMealPlanButton = () => {
    const record = useRecordContext();
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/meal-plans/${record?.id}/print`, "_blank")}
        >
            <Printer className="h-4 w-4" />
            Stampa PDF
        </Button>
    );
};

// ---------------------------------------------------------------------------
// transformMealPlan — strip checked entries whose ingredient qty increased
// ---------------------------------------------------------------------------

function countRecipesInSlots(slots: MealPlanSlots): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const daySlots of Object.values(slots)) {
        for (const mealSlots of Object.values(daySlots)) {
            for (const sv of Object.values(mealSlots)) {
                if (sv.recipeId) counts[sv.recipeId] = (counts[sv.recipeId] ?? 0) + 1;
            }
        }
    }
    return counts;
}

// transform prop for <Edit>: (data, { previousData }) => data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMealPlan(data: any, options?: { previousData: any }): any {
    const previousData = options?.previousData;
    const oldSlots: MealPlanSlots = (previousData?.slots as MealPlanSlots) ?? {};
    const newSlots: MealPlanSlots = (data?.slots as MealPlanSlots) ?? {};
    const currentChecked: string[] = (previousData?.shoppingListChecked as string[]) ?? [];

    const oldCounts = countRecipesInSlots(oldSlots);
    const newCounts = countRecipesInSlots(newSlots);

    // key format: "name|||unit|||recipeId"
    const filteredChecked = currentChecked.filter((key) => {
        const recipeId = key.split("|||")[2];
        if (!recipeId) return true;
        const newCount = newCounts[recipeId] ?? 0;
        return newCount > 0 && newCount <= (oldCounts[recipeId] ?? 0);
    });

    return { ...data, shoppingListChecked: filteredChecked };
}

// ---------------------------------------------------------------------------
// CRUD components
// ---------------------------------------------------------------------------

const MealPlanForm = () => (
    <SimpleForm>
        <WeekInput source="weekStart" />
        <SlotsInput source="slots" />
    </SimpleForm>
);

export const MealPlanList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="weekStart">
                <WeekField />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const MealPlanShow = () => (
    <Show>
        <SimpleShowLayout>
            <WeekField source="weekStart" />
            <SlotsField />
            <div className="flex gap-2 flex-wrap">
                <ShoppingListButton />
                <PrintMealPlanButton />
            </div>
        </SimpleShowLayout>
    </Show>
);

export const MealPlanEdit = () => (
    <Edit transform={transformMealPlan}>
        <MealPlanForm />
    </Edit>
);

export const MealPlanCreate = () => (
    <Create>
        <MealPlanForm />
    </Create>
);

// ---------------------------------------------------------------------------
// ShoppingListPage — custom route /meal-plans/:id/shopping-list
// ---------------------------------------------------------------------------

export const ShoppingListPage = () => {
    const { id = "" } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: mealPlan, isLoading: planLoading } = useGetOne(
        "meal-plans",
        { id },
        { enabled: Boolean(id) },
    );

    const { data: recipes = [], isLoading: recipesLoading } = useGetList("recipes", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const { data: ingredientRecords = [] } = useGetList("ingredients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const [update] = useUpdate();
    const checkedArr: string[] = useMemo(
        () => (mealPlan?.shoppingListChecked as string[] | undefined) ?? [],
        [mealPlan],
    );
    const [hideCompleted, setHideCompleted] = useStore<boolean>(`shoppingList.${id}.hideCompleted`, false);
    const checked = useMemo(() => new Set(checkedArr), [checkedArr]);

    const recipeMap = useMemo(
        () =>
            Object.fromEntries(
                recipes.map((r) => [
                    String(r.id),
                    r as { name?: string; ingredients?: RecipeIngredient[] },
                ]),
            ),
        [recipes],
    );

    // ingredient name → category (or "Altro" if unset)
    const ingredientCategoryMap = useMemo(
        () =>
            Object.fromEntries(
                ingredientRecords.map((r) => [
                    r.name as string,
                    (r.category as string) || "Altro",
                ]),
            ),
        [ingredientRecords],
    );

    const { grouped, sortedCategories } = useMemo(() => {
        if (!mealPlan) return { grouped: {} as Record<string, AggItem[]>, sortedCategories: [] as string[] };

        const slots = (mealPlan.slots as MealPlanSlots) ?? {};
        const totals = buildShoppingList(slots, recipeMap);

        const groups: Record<string, AggItem[]> = {};
        for (const item of Object.values(totals)) {
            const cat = ingredientCategoryMap[item.name] ?? "Altro";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        }
        for (const items of Object.values(groups)) {
            items.sort((a, b) => a.name.localeCompare(b.name, "it"));
        }

        const categories = Object.keys(groups).sort((a, b) => {
            if (a === "Altro") return 1;
            if (b === "Altro") return -1;
            return a.localeCompare(b, "it");
        });

        return { grouped: groups, sortedCategories: categories };
    }, [mealPlan, recipeMap, ingredientCategoryMap]);

    const allItems = sortedCategories.flatMap((c) => grouped[c]);
    const doneCount = allItems.filter((item) => {
        const subKeys = item.byRecipe.map((c) => `${item.name}|||${item.unit}|||${c.recipeId}`);
        return subKeys.length > 0 && subKeys.every((k) => checked.has(k));
    }).length;

    const saveChecked = (next: Set<string>) => {
        update("meal-plans", {
            id,
            data: { shoppingListChecked: Array.from(next) },
            previousData: mealPlan,
        });
    };

    const toggleCheck = (key: string) => {
        const next = new Set(checked);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveChecked(next);
    };

    if (planLoading || recipesLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Caricamento…
            </div>
        );
    }

    const weekLabel = mealPlan?.weekStart
        ? formatWeekRange(mealPlan.weekStart as string)
        : "";

    return (
        <div className="py-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold">Lista della spesa</h1>
                    {weekLabel && (
                        <p className="text-sm text-muted-foreground">{weekLabel}</p>
                    )}
                </div>
                {allItems.length > 0 && (
                    <>
                        <span className="text-sm text-muted-foreground">
                            {doneCount}/{allItems.length}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setHideCompleted(!hideCompleted)}
                            title={hideCompleted ? "Mostra completati" : "Nascondi completati"}
                        >
                            {hideCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    </>
                )}
            </div>

            {allItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Nessun ingrediente trovato. Aggiungi ricette alla pianificazione.
                </p>
            ) : (
                <div className="space-y-6">
                    {sortedCategories.map((cat) => {
                        const visibleItems = grouped[cat].filter((item) => {
                            if (!hideCompleted) return true;
                            const subKeys = item.byRecipe.map(
                                (c) => `${item.name}|||${item.unit}|||${c.recipeId}`,
                            );
                            return !(subKeys.length > 0 && subKeys.every((k) => checked.has(k)));
                        });
                        if (visibleItems.length === 0) return null;
                        return (
                        <div key={cat}>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                {cat}
                            </h2>
                            <div className="rounded-md border divide-y">
                                {visibleItems.map((item) => {
                                    const ingKey = `${item.name}|||${item.unit}`;
                                    const subKeys = item.byRecipe.map((c) => `${ingKey}|||${c.recipeId}`);
                                    const checkedCount = subKeys.filter((k) => checked.has(k)).length;
                                    const allChecked = checkedCount === subKeys.length && subKeys.length > 0;
                                    const someChecked = checkedCount > 0 && !allChecked;
                                    const uncheckedContribs = item.byRecipe.filter(
                                        (c) => !checked.has(`${ingKey}|||${c.recipeId}`),
                                    );
                                    const remainingNum = uncheckedContribs.reduce((s, c) => s + c.totalNum, 0);
                                    const remainingExtras = uncheckedContribs.flatMap((c) => c.extras);

                                    const toggleAll = () => {
                                        const next = new Set(checked);
                                        if (allChecked) subKeys.forEach((k) => next.delete(k));
                                        else subKeys.forEach((k) => next.add(k));
                                        saveChecked(next);
                                    };

                                    return (
                                        <div key={ingKey}>
                                            {/* Ingredient row — checkbox seleziona/deseleziona tutti */}
                                            <div
                                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                                onClick={toggleAll}
                                            >
                                                <Checkbox
                                                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                                                    onCheckedChange={toggleAll}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span
                                                    className={cn(
                                                        "flex-1 text-sm font-medium",
                                                        allChecked && "line-through text-muted-foreground",
                                                    )}
                                                >
                                                    {item.name}
                                                </span>
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {formatQty(remainingNum, item.unit, remainingExtras)}
                                                </span>
                                            </div>
                                            {/* Per-recipe breakdown con checkbox individuale */}
                                            {item.byRecipe.map((contrib) => {
                                                const key = `${ingKey}|||${contrib.recipeId}`;
                                                const isSubChecked = checked.has(key);
                                                return (
                                                    <div
                                                        key={contrib.recipeId}
                                                        className="flex items-center gap-3 pl-10 pr-4 py-1.5 border-t bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                                        onClick={() => toggleCheck(key)}
                                                    >
                                                        <Checkbox
                                                            checked={isSubChecked}
                                                            onCheckedChange={() => toggleCheck(key)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <span
                                                            className={cn(
                                                                "flex-1 text-xs text-muted-foreground",
                                                                isSubChecked && "line-through",
                                                            )}
                                                        >
                                                            {contrib.recipeName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatQty(contrib.totalNum, item.unit, contrib.extras)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// PrintMealPlanPage — custom route /meal-plans/:id/print
// Aperta in una nuova scheda; auto-trigger window.print() dopo il caricamento.
// ---------------------------------------------------------------------------

export const PrintMealPlanPage = () => {
    const { id = "" } = useParams<{ id: string }>();

    const { data: mealPlan, isLoading: planLoading } = useGetOne(
        "meal-plans",
        { id },
        { enabled: Boolean(id) },
    );

    const { data: users = [], isLoading: usersLoading } = useGetList("users", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const { data: recipes = [], isLoading: recipesLoading } = useGetList("recipes", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
    });

    const isLoading = planLoading || usersLoading || recipesLoading;

    const recipeMap = useMemo(
        () => Object.fromEntries(recipes.map((r) => [String(r.id), r.name as string])),
        [recipes],
    );

    // Auto-trigger il dialogo di stampa una volta che i dati sono pronti.
    useEffect(() => {
        if (isLoading || !mealPlan) return;
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, [isLoading, mealPlan]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
                Preparazione stampa…
            </div>
        );
    }

    const slots = (mealPlan?.slots as MealPlanSlots) ?? {};
    const weekLabel = formatWeekRange((mealPlan?.weekStart as string) ?? "");
    const today = new Date().toLocaleDateString("it-IT", {
        day: "numeric", month: "long", year: "numeric",
    });

    return (
        <>
            {/* ── Stili dedicati alla pagina di stampa ──────────────────────── */}
            <style>{`
                /* Schermo: simula la larghezza A4 portrait (210mm = ~794px a 96dpi)
                   meno i margini di stampa (1.5cm × 2 ≈ 113px) → ~681px */
                .print-page {
                    width: 100%;
                    max-width: 681px;
                    margin: 0 auto;
                    padding: 2rem 2.5rem;
                    box-sizing: border-box;
                    font-family: 'Plus Jakarta Sans Variable', sans-serif;
                    font-size: 12px;
                    color: #1a1a1a;
                    background: #fff;
                    min-height: 100vh;
                }
                .print-page table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: auto;
                }
                .print-page th,
                .print-page td {
                    border: 1px solid #d1d5db;
                    padding: 5px 8px;
                    vertical-align: top;
                    word-break: break-word;
                }
                .print-page th {
                    background: #f0fdf4;
                    font-weight: 600;
                    text-align: center;
                }
                .print-page th.row-header {
                    text-align: left;
                    width: 100px;
                    background: #f9fafb;
                    color: #6b7280;
                    font-weight: 500;
                }
                .print-page .day-section {
                    margin-bottom: 1.75rem;
                }
                .print-page .day-title {
                    font-size: 13px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #166534;
                    border-bottom: 2px solid #bbf7d0;
                    padding-bottom: 4px;
                    margin-bottom: 6px;
                }
                .print-page .day-title.empty {
                    color: #9ca3af;
                    border-color: #e5e7eb;
                }
                .print-page .recipe-name { font-weight: 600; font-size: 12px; }
                .print-page .recipe-note { font-size: 11px; color: #6b7280; margin-top: 2px; }
                .print-page .empty-cell { color: #d1d5db; text-align: center; }

                @media print {
                    @page { margin: 1.5cm; size: A4 portrait; }
                    html, body { margin: 0; padding: 0; background: #fff; }
                    .no-print { display: none !important; }
                    .print-page { max-width: 100%; padding: 0; min-height: auto; }
                    .print-page .day-section { page-break-inside: avoid; }
                }
            `}</style>

            <div className="print-page">
                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "20px" }}>🥗</span>
                            <span style={{ fontSize: "18px", fontWeight: 700 }}>La mia dieta</span>
                        </div>
                        <p style={{ fontSize: "14px", color: "#6b7280" }}>{weekLabel}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <Button variant="outline" size="sm" onClick={() => window.close()}>
                            <ArrowLeft className="h-4 w-4" />
                            Chiudi
                        </Button>
                        <Button size="sm" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" />
                            Stampa / Salva PDF
                        </Button>
                    </div>
                </div>

                {/* Intestazione visibile solo in stampa */}
                <div style={{ display: "none" }} className="print-header-only">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: 700 }}>🥗 La mia dieta — Piano settimanale</div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{weekLabel}</div>
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>Stampato il {today}</div>
                    </div>
                </div>
                <style>{`.print-header-only { display: none; } @media print { .print-header-only { display: block !important; } }`}</style>

                {/* ── Griglia per ogni giorno ───────────────────────────────── */}
                {DAYS.map((day) => {
                    const hasAnySlot = users.some((u) =>
                        MEALS.some((m) => slots[String(u.id)]?.[day.id]?.[m.id]?.recipeId),
                    );

                    return (
                        <div key={day.id} className="day-section">
                            <div className={cn("day-title", !hasAnySlot && "empty")}>
                                {day.label}
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th className="row-header" />
                                        {users.map((user) => (
                                            <th key={String(user.id)}>
                                                {user.name as string}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {MEALS.map((meal) => (
                                        <tr key={meal.id}>
                                            <th className="row-header">{meal.name}</th>
                                            {users.map((user) => {
                                                const userId = String(user.id);
                                                const sv = slots[userId]?.[day.id]?.[meal.id];
                                                const recipeName = sv?.recipeId
                                                    ? (recipeMap[sv.recipeId] ?? "?")
                                                    : null;
                                                return (
                                                    <td key={userId}>
                                                        {recipeName ? (
                                                            <>
                                                                <div className="recipe-name">{recipeName}</div>
                                                                {sv?.note && (
                                                                    <div className="recipe-note">{sv.note}</div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="empty-cell">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}

                {/* ── Footer (solo schermo) ─────────────────────────────────── */}
                <div className="no-print" style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "right" }}>
                    Stampato il {today}
                </div>
            </div>
        </>
    );
};
