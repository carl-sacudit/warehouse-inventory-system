
import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.PORT ?? 5001);

app.listen(PORT, () => {
  console.log(
    `StockFlow API running at http://localhost:${PORT}`
  );
});