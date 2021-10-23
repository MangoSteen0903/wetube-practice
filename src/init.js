import "dotenv/config";
import "./db";
import "./models/Video";
import "./models/User";
import "./models/Comment";
import app from "./server";

const PORT = 30000;
const handleListening = () =>
  console.log(`Server listening on port http://localhost:${PORT}`);
app.listen(PORT, handleListening);
