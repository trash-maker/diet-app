import {
    Create,
    DataTable,
    Edit,
    List,
    SelectField,
    SelectInput,
    Show,
    SimpleForm,
    SimpleShowLayout,
    TextField,
    TextInput,
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
            <DataTable.Col source="id" />
            <DataTable.Col source="name" />
            <DataTable.Col source="gender">
                <SelectField source="gender" choices={genderChoices} />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const UserShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="name" />
            <SelectField source="gender" choices={genderChoices} />
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

