import {
    Create,
    DataTable,
    Edit,
    List,
    SelectInput,
    Show,
    SimpleForm,
    SimpleShowLayout,
    TextField,
    TextInput
} from "@/components";

const genderChoices = [
    { id: "male", name: "Uomo" },
    { id: "female", name: "Donna" },
    { id: "other", name: "Altro" },
];

const UserForm = () => (
    <SimpleForm>
        <TextInput source="name" required />
        <SelectInput source="gender" choices={genderChoices} />
    </SimpleForm>
);

export const UserList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="name" />
        </DataTable>
    </List>
);

export const UserShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="name" />
        </SimpleShowLayout>
    </Show>
);

export const UserEdit = () => (
    <Edit>
        <UserForm />
    </Edit>
);

export const UserCreate = () => (
    <Create>
        <UserForm />
    </Create>
);

