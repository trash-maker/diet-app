import { Resource } from "ra-core";
import { UsersIcon, AppleIcon } from "lucide-react";
import localStorageDataProvider from "ra-data-local-storage";
import { Admin } from "@/components/admin";
import { UserList, UserShow, UserEdit, UserCreate } from "@/resources/users";
import {
    AlimentList,
    AlimentShow,
    AlimentEdit,
    AlimentCreate,
} from "@/resources/aliments";

const dataProvider = localStorageDataProvider();

const App = () => (
    <Admin dataProvider={dataProvider}>
        <Resource
            name="users"
            icon={UsersIcon}
            list={UserList}
            show={UserShow}
            edit={UserEdit}
            create={UserCreate}
        />
        <Resource
            name="aliments"
            icon={AppleIcon}
            list={AlimentList}
            show={AlimentShow}
            edit={AlimentEdit}
            create={AlimentCreate}
        />
    </Admin>
);

export default App;
