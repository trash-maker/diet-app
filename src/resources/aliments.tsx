import React, { useMemo, useRef, useState } from "react";
import { Resource } from "ra-core";
import { FieldTitle, useGetList, useInput, useRecordContext } from "ra-core";
import type { InputProps } from "ra-core";
import { AppleIcon, X } from "lucide-react";
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
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type TagsInputProps = Omit<InputProps, "source"> &
    Partial<Pick<InputProps, "source">> & { className?: string };

const TagsInput = (props: TagsInputProps) => {
    const source = props.source ?? "tags";
    const { id, field, isRequired } = useInput({ ...props, source, defaultValue: [] });
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const { data: aliments = [] } = useGetList("aliments", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "id", order: "ASC" },
    });

    const suggestions = useMemo(() => {
        const all = aliments.flatMap((r) => (r.tags as string[]) ?? []);
        return [...new Set(all)].filter((t) => !(field.value ?? []).includes(t));
    }, [aliments, field.value]);

    const filtered = inputValue
        ? suggestions.filter((t) => t.toLowerCase().includes(inputValue.toLowerCase()))
        : suggestions;

    const addTag = (tag: string) => {
        const t = tag.trim();
        if (!t || (field.value ?? []).includes(t)) return;
        field.onChange([...(field.value ?? []), t]);
        setInputValue("");
    };

    const removeTag = (tag: string) => {
        field.onChange((field.value ?? []).filter((t: string) => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if ((e.key === "Enter" || e.key === ",") && inputValue) {
            e.preventDefault();
            addTag(inputValue);
        }
        if ((e.key === "Backspace" || e.key === "Delete") && !inputValue) {
            field.onChange((field.value ?? []).slice(0, -1));
        }
        if (e.key === "Escape") inputRef.current?.blur();
    };

    return (
        <FormField className={props.className} id={id} name={field.name}>
            {props.label !== false && (
                <FormLabel>
                    <FieldTitle label={props.label} source={source} isRequired={isRequired} />
                </FormLabel>
            )}
            <FormControl>
                <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
                    <div className="group rounded-md bg-transparent dark:bg-input/30 border border-input px-3 py-1.75 text-sm transition-all ring-offset-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                        <div className="flex flex-wrap gap-1">
                            {(field.value ?? []).map((tag: string) => (
                                <Badge key={tag} variant="outline">
                                    {tag}
                                    <button
                                        type="button"
                                        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onClick={(e) => { e.preventDefault(); removeTag(tag); }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <CommandPrimitive.Input
                                ref={inputRef}
                                value={inputValue}
                                onValueChange={setInputValue}
                                onBlur={() => setOpen(false)}
                                onFocus={() => setOpen(true)}
                                placeholder="Type and press Enter…"
                                className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <CommandList>
                            {open && filtered.length > 0 && (
                                <div className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                                    <CommandGroup className="h-full overflow-auto">
                                        {filtered.map((tag) => (
                                            <CommandItem
                                                key={tag}
                                                value={tag}
                                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onSelect={() => addTag(tag)}
                                                className="cursor-pointer"
                                            >
                                                {tag}
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

const TagsField = () => {
    const record = useRecordContext();
    const tags: string[] = record?.tags ?? [];
    if (!tags.length) return null;
    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
        </div>
    );
};

const AlimentForm = () => (
    <SimpleForm>
        <TextInput source="name" required />
        <TextInput source="description" multiline />
        <TagsInput source="tags" />
    </SimpleForm>
);

export const AlimentList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="name" />
            <DataTable.Col source="description" />
            <DataTable.Col source="tags">
                <TagsField />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const AlimentShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="description" />
            <TagsField />
        </SimpleShowLayout>
    </Show>
);

export const AlimentEdit = () => (
    <Edit>
        <AlimentForm />
    </Edit>
);

export const AlimentCreate = () => (
    <Create>
        <AlimentForm />
    </Create>
);

export const AlimentsResource = (
    <Resource
        name="aliments"
        icon={AppleIcon}
        list={AlimentList}
        show={AlimentShow}
        edit={AlimentEdit}
        create={AlimentCreate}
    />
);
