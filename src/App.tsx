import { Resource } from "ra-core";
import { UsersIcon, AppleIcon, UtensilsCrossedIcon } from "lucide-react";
import localStorageDataProvider from "ra-data-local-storage";
import { Admin } from "@/components/admin";
import { UserList, UserShow, UserEdit, UserCreate } from "@/resources/users";
import {
    AlimentList,
    AlimentShow,
    AlimentEdit,
    AlimentCreate,
} from "@/resources/aliments";
import {
    RecipeList,
    RecipeShow,
    RecipeEdit,
    RecipeCreate,
} from "@/resources/recipes";

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
        <Resource
            name="recipes"
            icon={UtensilsCrossedIcon}
            list={RecipeList}
            show={RecipeShow}
            edit={RecipeEdit}
            create={RecipeCreate}
        />
    </Admin>
);

export default App;
