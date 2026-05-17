import localStorageDataProvider from "ra-data-local-storage";
import { Admin } from "@/components/admin";
import { UsersResource } from "@/resources/users";

const dataProvider = localStorageDataProvider();

const App = () => (
    <Admin dataProvider={dataProvider}>
        {UsersResource}
    </Admin>
);

export default App;
