import { CustomRoutes, Resource } from "ra-core";
import { UsersIcon, AppleIcon, UtensilsCrossedIcon, CalendarDaysIcon } from "lucide-react";
import { Route } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseDataProvider, supabaseAuthProvider } from "ra-supabase-core";
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
import {
    MealPlanList,
    MealPlanShow,
    MealPlanEdit,
    MealPlanCreate,
    ShoppingListPage,
    PrintMealPlanPage,
} from "@/resources/meal-plans";

const instanceUrl = import.meta.env.VITE_SUPABASE_URL as string;
const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseClient = createClient(instanceUrl, apiKey);

const baseProvider = supabaseDataProvider({ instanceUrl, apiKey, supabaseClient });
const authProvider = supabaseAuthProvider(supabaseClient, {});

const dataProvider = {
    ...baseProvider,
    getList: async (resource: string, params: Parameters<typeof baseProvider.getList>[1]) => {
        if (resource === "recipes" && params.filter?.ingredient_name) {
            const { ingredient_name, ...restFilter } = params.filter as Record<string, string>;
            const all = await baseProvider.getList(resource, {
                ...params,
                filter: restFilter,
                pagination: { page: 1, perPage: 10000 },
            });
            const regex = new RegExp(ingredient_name, "i");
            const filtered = all.data.filter((recipe) =>
                ((recipe.ingredients ?? []) as { name: string }[]).some((ing) =>
                    regex.test(ing.name),
                ),
            );
            const { page = 1, perPage = 10 } = params.pagination ?? {};
            return {
                data: filtered.slice((page - 1) * perPage, page * perPage),
                total: filtered.length,
            };
        }
        return baseProvider.getList(resource, params);
    },
};

const App = () => (
    <Admin dataProvider={dataProvider} authProvider={authProvider} requireAuth>
        <CustomRoutes>
            <Route path="/meal-plans/:id/shopping-list" element={<ShoppingListPage />} />
        </CustomRoutes>
        <CustomRoutes noLayout>
            <Route path="/meal-plans/:id/print" element={<PrintMealPlanPage />} />
        </CustomRoutes>
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
        <Resource
            name="meal-plans"
            icon={CalendarDaysIcon}
            list={MealPlanList}
            show={MealPlanShow}
            edit={MealPlanEdit}
            create={MealPlanCreate}
        />
    </Admin>
);

export default App;
