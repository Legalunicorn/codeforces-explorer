// src/store.js
import userReducer from "./context/user/userSlice";
import solutionsReducer from "./context/solutions/solutionsSlice";
import problemsetReducer from "./context/problemset/problemsetSlice";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    user: userReducer,
    solutions: solutionsReducer,
    problemset: problemsetReducer,
  },
});

export default store;