import { bootstrap } from "./app/bootstrap";
import { configureSuggestionVersionItemsSource } from "./app/dependencies/suggestions";
import { getCurrentVersionItems } from "@services/versions/versions";

configureSuggestionVersionItemsSource(getCurrentVersionItems);
bootstrap();
