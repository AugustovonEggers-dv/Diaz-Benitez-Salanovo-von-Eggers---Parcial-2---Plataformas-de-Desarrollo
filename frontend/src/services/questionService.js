import { apiRequest } from "./api";

export async function getCategories() {
  return apiRequest("/questions/categories");
}

export async function getGameQuestions(category = "all", count = 5) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.append("category", category);
  if (count) params.append("count", count);
  return apiRequest(`/questions/game?${params.toString()}`);
}

export async function getAllQuestions() {
  return apiRequest("/questions");
}

export async function createQuestion(questionData) {
  return apiRequest("/questions", {
    method: "POST",
    body: JSON.stringify(questionData),
  });
}

export async function updateQuestion(id, questionData) {
  return apiRequest(`/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(questionData),
  });
}

export async function deleteQuestion(id) {
  return apiRequest(`/questions/${id}`, {
    method: "DELETE",
  });
}