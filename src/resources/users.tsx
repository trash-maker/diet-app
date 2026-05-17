import { Resource } from "ra-core";
import { UsersIcon } from "lucide-react";
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
    { id: "male", name: "Male" },
    { id: "female", name: "Female" },
    { id: "other", name: "Other" },
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

export const UsersResource = (
    <Resource
        name="users"
        icon={UsersIcon}
        list={UserList}
        show={UserShow}
        edit={UserEdit}
        create={UserCreate}
    />
);
