import { pool } from "./index.js";
import { seedFoods } from "./seed.js";

seedFoods()
  .then((n) => console.log(`Seeded ${n} common foods.`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
