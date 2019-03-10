import * as express from "express";
import * as morgan from "morgan";
import * as path from "path";

import { router as indexRouter } from "./routes/index";

const app = express();

app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, '../../public'), {
    extensions: ["js"]
}));

app.use(indexRouter);

app.get('/', (req, res) => {
    res.send('Hello world!');
});

app.listen(3000, () => {
    console.log('Example app listening on port 3000!!');
});