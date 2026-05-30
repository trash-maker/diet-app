import { useEffect, useMemo, useRef, useState } from "react";
import { FieldTitle, useGetList, useInput } from "ra-core";
import type { InputProps } from "ra-core";
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
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

// ---------------------------------------------------------------------------
// CategoryInput — autocomplete su valori già presenti nel dataset
// ---------------------------------------------------------------------------

type CategoryInputProps = Omit<InputProps, "source"> &
    Partial<Pick<InputProps, "source">> & { className?: string };

const CategoryInput = (props: CategoryInputProps) => {
    const source = props.source ?? "category";
    const { id, field, isRequired } = useInput({ ...props, source, defaultValue: "" });
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState<string>(() => field.value ?? "");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInputValue(field.value ?? "");
    }, [field.value]);

    const { data: ingredients = [] } = useGetList("ingredients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "id", order: "ASC" },
    });

    const suggestions = useMemo(() => {
        const all = ingredients
            .map((r) => r.category as string)
            .filter(Boolean);
        return [...new Set(all)].sort();
    }, [ingredients]);

    const filtered = inputValue
        ? suggestions.filter((c) =>
              c.toLowerCase().includes(inputValue.toLowerCase()),
          )
        : suggestions;

    const selectCategory = (cat: string) => {
        setInputValue(cat);
        field.onChange(cat);
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleChange = (val: string) => {
        setInputValue(val);
        field.onChange(val);
    };

    return (
        <FormField className={props.className} id={id} name={field.name}>
            {props.label !== false && (
                <FormLabel>
                    <FieldTitle
                        label={props.label}
                        source={source}
                        isRequired={isRequired}
                    />
                </FormLabel>
            )}
            <FormControl>
                <Command className="overflow-visible bg-transparent">
                    <div className="rounded-md bg-transparent dark:bg-input/30 border border-input px-3 py-1.75 text-sm transition-all ring-offset-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                        <CommandPrimitive.Input
                            ref={inputRef}
                            value={inputValue}
                            onValueChange={handleChange}
                            onBlur={() => setOpen(false)}
                            onFocus={() => setOpen(true)}
                            placeholder="Seleziona o scrivi una categoria…"
                            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="relative">
                        <CommandList>
                            {open && filtered.length > 0 && (
                                <div className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                                    <CommandGroup className="h-full overflow-auto">
                                        {filtered.map((cat) => (
                                            <CommandItem
                                                key={cat}
                                                value={cat}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onSelect={() => selectCategory(cat)}
                                                className="cursor-pointer"
                                            >
                                                {cat}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </div>
                            )}
                        </CommandList>
                    </div>
                </Command>
            </FormControl>
            <InputHelperText helperText={props.helperText} />
            <FormError />
        </FormField>
    );
};

// ---------------------------------------------------------------------------
// Form condiviso
// ---------------------------------------------------------------------------

const IngredientForm = () => (
    <SimpleForm>
        <TextInput source="name" required />
        <TextInput source="description" multiline />
        <CategoryInput source="category" />
    </SimpleForm>
);

// ---------------------------------------------------------------------------
// List / Show / Edit / Create
// ---------------------------------------------------------------------------

const ingredientFilters = [
    <SearchInput source="name@ilike" alwaysOn parse={(v: string) => (v ? `%${v}%` : "")} format={(v: string) => (v ? v.replace(/^%|%$/g, "") : "")} />,
];

export const IngredientList = () => (
    <List filters={ingredientFilters}>
        <DataTable>
            <DataTable.Col source="name" />
            <DataTable.Col source="description" />
            <DataTable.Col source="category" />
        </DataTable>
    </List>
);

export const IngredientShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="name" />
            <TextField source="description" />
            <TextField source="category" />
        </SimpleShowLayout>
    </Show>
);

export const IngredientEdit = () => (
    <Edit>
        <IngredientForm />
    </Edit>
);

export const IngredientCreate = () => (
    <Create>
        <IngredientForm />
    </Create>
);
