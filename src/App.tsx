import { Resource } from "ra-core";
import { UsersIcon, AppleIcon, UtensilsCrossedIcon } from "lucide-react";
import localStorageDataProvider from "ra-data-local-storage";
import { Admin } from "@/components/admin";
import { UserList, UserShow, UserEdit, UserCreate } from "@/resources/users";
import {
    IngredientList,
    IngredientShow,
    IngredientEdit,
    IngredientCreate,
} from "@/resources/ingredients";
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
            name="ingredients"
            icon={AppleIcon}
            list={IngredientList}
            show={IngredientShow}
            edit={IngredientEdit}
            create={IngredientCreate}
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
