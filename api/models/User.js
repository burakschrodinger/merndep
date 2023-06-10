let mongoose = require("mongoose");
let { Schema, model } = mongoose;

let UserSchema = new Schema({
  username: { type: String, required: true, min: 4, unique: true },
  password: { type: String, required: true },
});
let UserModel = model("User", UserSchema);
module.exports = UserModel;
