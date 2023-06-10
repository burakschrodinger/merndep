let express = require("express");
let cors = require("cors");
const mongoose = require("mongoose");
let app = express();
let User = require("./models/User");
let bcrypt = require("bcrypt");
const Post = require("./models/Post");
let jwt = require("jsonwebtoken");
let cookieParser = require("cookie-parser");
const multer = require("multer");
let dotenv = require("dotenv");
dotenv.config();

const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
let secret = "adsmkasdşsdfmkewkfm3fkd";
let salt = 10;
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://burak:T2ElMsd1UNn9Qw2X@cluster0.ac7sisd.mongodb.net/?retryWrites=true&w=majority"
);
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    let UserDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(UserDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});
app.post("/login", async (req, res) => {
  let { username, password } = req.body;
  let UserDoc = await User.findOne({ username });
  let passOk = bcrypt.compareSync(password, UserDoc.password);

  if (passOk) {
    jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: UserDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrongg cret");
  }
});
app.get("/profile", (req, res) => {
  let { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});
app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});
app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});
app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { id, title, summary, content } = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor =
        JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(400).json("you are not the author");
      }
      await postDoc.update({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      });

      res.json(postDoc);
    });
  }
});
app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

if (process.env.API_PORT) {
  app.listen(process.env.API_PORT);
}
module.exports = app;
