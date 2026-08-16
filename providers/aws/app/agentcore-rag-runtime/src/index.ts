import { createRuntimeServer } from "./app.js";
import { createRuntimeDependencies } from "./runtimeEntry.js";

const port = Number(process.env.PORT ?? "8080");
const dependencies = await createRuntimeDependencies();
const server = createRuntimeServer(dependencies);

server.listen(port, "0.0.0.0", () => {
  console.log(`governed AgentCore RAG runtime listening on ${port}`);
});
