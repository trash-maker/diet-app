import { useMemo, useState } from "react";
import {
    FieldTitle,
    useGetList,
    useInput,
    useRecordContext,
    useResourceContext,
} from "ra-core";
import {
    Create,
    DataTable,
    Edit,
    List,
    Show,
    SimpleForm,
    SimpleShowLayout,
    TextField,
} from "@/components";
import { FormControl, FormError, FormField, FormLabel } from "@/components/form";
import { InputHelperText } from "@/components/input-helper-text";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
                            {/* Day selector */}
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

                            {/* Grid: rows = users, cols = meals */}
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 pl-3 pr-4 text-left font-semibold w-32">
                                                {selectedDayLabel}
                                            </th>
                                            {MEALS.map((meal) => (
                                                <th
                                                    key={meal.id}
                                                    className="py-2 px-3 text-center font-normal text-muted-foreground whitespace-nowrap"
                                                >
                                                    {meal.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => {
                                            const userId = String(user.id);
                                            return (
                                                <tr key={userId} className="border-t first:border-t-0">
                                                    <td className="py-2 pl-3 pr-4 font-medium align-top">
                                                        {user.name}
                                                    </td>
                                                    {MEALS.map((meal) => {
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
                                                                key={meal.id}
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
                                            );
                                        })}
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

    const recipeMap = useMemo(
        () => Object.fromEntries(recipes.map((r) => [String(r.id), r.name as string])),
        [recipes],
    );

    const selectedDayLabel = DAYS.find((d) => d.id === selectedDay)?.label ?? selectedDay;

    if (users.length === 0)
        return (
            <p className="text-sm text-muted-foreground">Nessun utente disponibile.</p>
        );

    return (
        <div className="space-y-3">
            {/* Day selector */}
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

            {/* Read-only grid: rows = users, cols = meals */}
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pl-3 pr-4 text-left font-semibold w-32">
                                {selectedDayLabel}
                            </th>
                            {MEALS.map((meal) => (
                                <th
                                    key={meal.id}
                                    className="py-2 px-3 text-center font-normal text-muted-foreground whitespace-nowrap"
                                >
                                    {meal.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const userId = String(user.id);
                            return (
                                <tr key={userId} className="border-t first:border-t-0">
                                    <td className="py-2 pl-3 pr-4 font-medium align-top">
                                        {user.name}
                                    </td>
                                    {MEALS.map((meal) => {
                                        const sv = slots[userId]?.[selectedDay]?.[meal.id];
                                        const recipeName = sv?.recipeId
                                            ? (recipeMap[sv.recipeId] ?? sv.recipeId)
                                            : null;
                                        return (
                                            <td
                                                key={meal.id}
                                                className="py-2 px-3 min-w-44 align-top"
                                            >
                                                {recipeName ? (
                                                    <div className="space-y-0.5">
                                                        <p className="font-medium">{recipeName}</p>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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
            <DataTable.Col source="id" />
            <DataTable.Col source="weekStart">
                <WeekField />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const MealPlanShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <WeekField source="weekStart" />
            <SlotsField />
        </SimpleShowLayout>
    </Show>
);

export const MealPlanEdit = () => (
    <Edit>
        <MealPlanForm />
    </Edit>
);

export const MealPlanCreate = () => (
    <Create>
        <MealPlanForm />
    </Create>
);
