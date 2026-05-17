import localStorageDataProvider from "ra-data-local-storage";
import { Admin } from "@/components/admin";
import { UsersResource } from "@/resources/users";
import { AlimentsResource } from "@/resources/aliments";

const dataProvider = localStorageDataProvider();

const App = () => (
    <Admin dataProvider={dataProvider}>
        {UsersResource}
        {AlimentsResource}
    </Admin>
);

export default App;
