// estos serían los datos clave que se usan en localStorage
const STORAGE_KEYS = {
  users: "desafioMental.users",
  session: "desafioMental.session",
  games: "desafioMental.games",
  activeGame: "desafioMental.activeGame"
};

// acá se buscan elementos del HTML, muestra donde se dibuja la pantalla y donde se muestra el usuario
const app = document.querySelector("#app");
const headerUser = document.querySelector("#header-user");

let users = readStorage(STORAGE_KEYS.users, []);
let games = readStorage(STORAGE_KEYS.games, []);
let session = readStorage(STORAGE_KEYS.session, null);
let activeGame = readStorage(STORAGE_KEYS.activeGame, null);

// el estado
let loadStatus = "idle";
// mensaje q se muestra si falla la carga
let loadMessage = "";
// permite detener el reloj de la pregunta actual
let timerInterval = null;
// para detener o reprogramar el paso a la siguiente pregunta.
let advanceTimeout = null;
// indica qué pantalla debe dibujarse
let currentRoute = "auto";

/*
 * String -> String
 * convierte caracteres especiales en texto
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

/*
 * String, a -> a
 * localStorage.getItem(key) devuelve un texto o null si la clave no existe.
 * JSON.parse convierte ese texto en un arreglo u objeto de JavaScript.
 * el try/catch evita que la aplicación se detenga si el contenido guardado no es JSON válido.
 */
function readStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue === null ? fallback : JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

/*
 * String, a -> Boolean
 * JSON.stringify convierte objetos y arrays en texto para guardarlos.
 * La función devuelve true si pudo guardarlos y false si hubo un error.
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

/*
 * String -> String
 * Esto sería función de formato, donde recibe una fecha guardada y la presenta según el formato de Argentina
 */
function formatDate(value) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

/*
 * Number -> String
 * formatea una cantidad de segundos como minutos y segundos.
 * Evita duraciones negativas y decimales
 */
function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/*
 * Number -> String
 * se evalúa el porcentaje de arriba hacia abajo.
 * Y la primera condición que se cumple devuelve el mensaje correspondiente y termina la función.
 */
function performanceMessage(percentage) {
  if (percentage === 100) return "¡Partida perfecta!";
  if (percentage >= 70) return "¡Excelente desempeño!";
  if (percentage >= 40) return "Vas por buen camino";
  return "Necesitás seguir practicando";
}

/*
 * () -> String
 * crea un identificador único para una nueva partida
 * La hora reduce la posibilidad de repetición, el componente aleatorio ayuda si se crean partidas muy seguidas
 */
function createId() {
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/*
 * String -> User | null
 * busca y devuelve el usuario de la sesión actual, si existe
 */
function getCurrentUser() {
  if (!session || !session.username) return null;
  return users.find(function (user) {
    return user.username.toLowerCase() === session.username.toLowerCase();
  }) || null;
}

/*
 * () -> Array<String>
 * devuelve las categorías disponibles, sin duplicados
 * map transforma la lista de preguntas en una lista de categorías, posiblemente repetidas.
 * set elimina duplicados
 * Los tres puntos ... expanden ese conjunto y lo convierten nuevamente en array
 */
function getCategories() {
  return [...new Set(QUESTIONS.map(function (question) {
    return question.category;
  }))];
}

/*
 * String -> Array<Game>
 * devuelve las partidas del usuario indicado, ordenadas desde la más reciente
 */
function getUserGames(username) {
  return games
    .filter(function (game) {
      return game.username.toLowerCase() === username.toLowerCase();
    })
    .sort(function (first, second) {
      return new Date(second.finishedAt || second.startedAt) -
        new Date(first.finishedAt || first.startedAt);
    });
}

/*
 * Array<Game>, Number -> Object
 * RECURSIVIDAD:
 * esta función avanza por el historial usando index.
 * cuando llegó al final, ya no hay partidas que resumir, así que devuelve los valores iniciales.
 */
function resumirHistorialRecursivo(history, index) {
  if (index >= history.length) {
    return { completadas: 0, abandonadas: 0, puntajeCompletadas: 0 };
  }

  const current = history[index];

  // esta es la llamada recursiva, la función se vuelve a llamar con el índice siguiente
  const rest = resumirHistorialRecursivo(history, index + 1);

  if (current.status === "completed") {
    return {
      completadas: rest.completadas + 1,
      abandonadas: rest.abandonadas,
      puntajeCompletadas: rest.puntajeCompletadas + current.score
    };
  }

  if (current.status === "abandoned") {
    return {
      completadas: rest.completadas,
      abandonadas: rest.abandonadas + 1,
      puntajeCompletadas: rest.puntajeCompletadas
    };
  }

  return rest;
}

/*
 * Function, Function -> Function
 * Compone dos funciones: el resultado de la segunda pasa a la primera.
 * la consigna pide funciones de orden superior y composición, dice que las operaciones de selección, transformación y cálculo estén separadas.
 * por eso existen funciones chicas para esas operaciones y componer las conectaría
 */
function componer(firstFunction, secondFunction) {
  return function (value) {
    return firstFunction(secondFunction(value));
  };
}

/*
 * Array<Game>, String -> Array<Object>
 * Selecciona las partidas de una categoría y transforma sus respuestas contestadas.
 * filter conserva solamente las partidas de la categoría elegida
 * flatMap transforma cada partida en sus respuestas y aplana las listas resultantes en una sola
 */
function seleccionarYTransformarRespuestas(history, category) {
  return history
    .filter(function (game) {
      return game.category === category;
    })
    .flatMap(function (game) {
      return game.answers.map(function (answer) {
        return {
          category: game.category,
          correct: answer.correct === true
        };
      });
    });
}

/*
 * Array<Object> -> Object
 * cuenta las respuestas correctas y calcula el porcentaje
 */
function calcularPorcentajeRespuestas(answers) {
  const correct = answers.filter(function (answer) {
    return answer.correct;
  }).length;

  const total = answers.length;
  return {
    correct: correct,
    total: total,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100)
  };
}

/*
 * Array<Game>, String -> Object
 * recibe historial y categoría, selecciona las respuestas correspondientes y calcula el porcentaje
 */
function calcularEstadisticaCategoria(history, category) {
  const preparar = componer(
    calcularPorcentajeRespuestas,
    function (value) {
      return seleccionarYTransformarRespuestas(value.history, value.category);
    }
  );

  return preparar({ history: history, category: category });
}

/* 
 * Array<Game> -> Object
 * ESTO SERÍAN LAS ESTADÍSTICAS PERSONALES
 * calcula las estadísticas personales usando partidas completadas
 * primero filtra las partidas completadas, reduce recorre una colección y transforma en un único resultado:
 * suma las rtas., cuenta aciertos o busca el mayor valor
 */
function calculatePersonalStats(history) {
  const completed = history.filter(function (game) {
    return game.status === "completed";
  });

  const totalQuestions = completed.reduce(function (total, game) {
    return total + game.answers.length;
  }, 0);

  const totalCorrect = completed.reduce(function (total, game) {
    return total + game.correctCount;
  }, 0);

  return {
    completedGames: completed.length,
    totalQuestions: totalQuestions,
    globalPercentage: totalQuestions === 0
      ? 0
      : Math.round((totalCorrect / totalQuestions) * 100),
    highestScore: completed.reduce(function (highest, game) {
      return Math.max(highest, game.score);
    }, 0),
    bestStreak: completed.reduce(function (best, game) {
      return Math.max(best, game.bestStreak);
    }, 0)
  };
}

/*
 * Number -> Promise<Array<Question>>
 * PROMISE: representa una operación que aún NO terminó.
 * setTimeout lo uso para simular una demora, después resuelve con las preguntas o rechaza con un error
 * Es decir:
 * RESOLVE indica que la operación salió bien
 * REJECT indica que la operación salió mal
 * 
 * La clave de localStorage sirve para poder provocar el error y comprobar que el mensaje y el botón de reintento funcionan bien
 */
function loadQuestionBank() {
  return new Promise(function (resolve, reject) {
    window.setTimeout(function () {
      const simulateError = localStorage.getItem("desafioMental.simularErrorCarga") === "1";
      if (simulateError) {
        reject(new Error("No se pudo preparar el banco de preguntas."));
        return;
      }
      resolve(QUESTIONS);
    }, 1000);
  });
}

/*
 * () -> Promise<Boolean>
 * async permite usar await.
 * await loadQuestionBank() espera el resultado de la promesa.
 * Si se resuelve, entra en try; si se rechaza, entra en catch.
 */
async function prepareQuestionBank() {
  loadStatus = "loading";
  loadMessage = "";
  render();

  try {
    await loadQuestionBank();
    loadStatus = "ready";
    loadMessage = "";
    render();
    return true;
  } catch (error) {
    loadStatus = "error";
    loadMessage = error.message;
    render();
    return false;
  }
}

/*
 * () -> String
 * ESTA PARTE ES PARA ELEGIR LA PANTALLA Y NAVEGAR.
 * devuelve la pantalla inicial adecuada según sesión y partida guardada
 */
function getInitialRoute() {
  if (!getCurrentUser()) return "login";
  if (activeGame && activeGame.username === session.username) {
  return activeGame.status === "completed" ? "results" : "game"; }
  return "dashboard";
}

/*
 * String -> ()
 * este bloque basicamente impide mostrar ciertas pantallas si no hay sesión, asigna la nueva ruta y vuelve a dibujarla.
 * Si se entra al menú y el banco todavía no está listo, inicia la carga.
 */
function navigate(route) {
  if (route === "dashboard" || route === "history" || route === "ranking" ||
      route === "category-stats" || route === "game" || route === "results") {
    if (!getCurrentUser()) {
      route = "login";
    }
  }

  currentRoute = route;
  render();

  if (route === "dashboard" && loadStatus !== "ready" && loadStatus !== "loading") {
    prepareQuestionBank();
  }
}

/*
 * () -> ()
 * render muestra la pantalla, pero antes limpia el temporizador anterior, busca el usuario y decide una ruta inicial si todavía está en "auto"
 * por otro lado, views es un objeto que asocia el nombre de cada ruta con la función que la genera
 */
function render() {
  window.clearInterval(timerInterval);
  headerUser.innerHTML = "";

  const user = getCurrentUser();
  if (user) {
    headerUser.innerHTML = `Sesión: <strong>${escapeHtml(user.username)}</strong>`;
  }

  if (currentRoute === "auto") {
    currentRoute = getInitialRoute();
  }

  if (!user && !["login", "register"].includes(currentRoute)) {
    currentRoute = "login";
  }

  const views = {
    login: renderLogin,
    register: renderRegister,
    dashboard: renderDashboard,
    game: renderGame,
    results: renderResults,
    history: renderHistory,
    ranking: renderRanking,
    "category-stats": renderCategoryStats
  };

  app.innerHTML = (views[currentRoute] || renderLogin)();

  if (currentRoute === "game" && activeGame && !activeGame.locked) {
    startTimer();
  }

  if (currentRoute === "game" && activeGame && activeGame.locked) {
    resumeAdvance();
  }
}

// Ahora se crean funciones distintas para cada pantalla, cada una representa una vista
// Las comillas invertidas permiten crear una plantilla en varias líneas y ${game.score} inserta un valor dinámico en esa plantilla.

/*
 * () -> String
 * devuelve el formulario para crear una cuenta.
 */
function renderRegister() {
  return `
    <section class="card narrow">
      <p class="eyebrow">Crear cuenta</p>
      <h1>Sumate al desafío</h1>
      <p class="muted">Completá tus datos para guardar tus partidas y estadísticas.</p>
      <form id="register-form" class="form-stack" novalidate>
        <div class="field">
          <label for="register-username">Nombre de usuario</label>
          <input id="register-username" name="username" minlength="4" maxlength="16"
            autocomplete="username" required>
        </div>
        <div class="field">
          <label for="register-email">Correo electrónico</label>
          <input id="register-email" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="register-password">Contraseña</label>
            <input id="register-password" name="password" type="password" minlength="8"
              autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="register-confirm">Confirmar contraseña</label>
            <input id="register-confirm" name="confirmPassword" type="password"
              autocomplete="new-password" required>
          </div>
        </div>
        <div id="form-message" role="alert"></div>
        <button class="button" type="submit">Crear cuenta</button>
      </form>
      <p class="muted">¿Ya tenés cuenta?
        <a class="inline-link" href="#" data-action="go-login">Iniciá sesión</a>
      </p>
    </section>
  `;
}

/*
 * () -> String
 * devuelve el formulario para iniciar sesión
 */
function renderLogin() {
  return `
    <section class="card narrow">
      <p class="eyebrow">Bienvenido</p>
      <h1>Iniciá sesión</h1>
      <p class="muted">Ingresá con tu nombre de usuario y contraseña.</p>
      <form id="login-form" class="form-stack" novalidate>
        <div class="field">
          <label for="login-username">Nombre de usuario</label>
          <input id="login-username" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="login-password">Contraseña</label>
          <input id="login-password" name="password" type="password"
            autocomplete="current-password" required>
        </div>
        <div id="form-message" role="alert"></div>
        <button class="button" type="submit">Ingresar</button>
      </form>
      <p class="muted">¿Todavía no tenés cuenta?
        <a class="inline-link" href="#" data-action="go-register">Registrate</a>
      </p>
    </section>
  `;
}

/*
 * () -> String
 * devuelve el panel principal con estadísticas, carga y accesos.
 */
function renderDashboard() {
  const user = getCurrentUser();
  const history = getUserGames(user.username);
  const stats = calculatePersonalStats(history);
  const summary = resumirHistorialRecursivo(history, 0);

  let loader = "";
  if (loadStatus === "loading" || loadStatus === "idle") {
    loader = `
      <div class="loading-box" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>Preparando el banco de preguntas… No se puede comenzar una partida todavía.</span>
      </div>
    `;
  } else if (loadStatus === "error") {
    loader = `
      <div class="notice error" role="alert">
        ${escapeHtml(loadMessage)}
        <div class="button-row" style="margin-top: 10px">
          <button class="button secondary" type="button" data-action="retry-load">Reintentar carga</button>
        </div>
      </div>
    `;
  } else {
    loader = `<div class="notice success">Banco de preguntas listo. Ya podés comenzar.</div>`;
  }

  const categories = getCategories().map(function (category) {
    return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
  }).join("");

  return `
    <section class="hero">
      <p class="eyebrow">Tu espacio de juego</p>
      <h1>¡Hola, ${escapeHtml(user.username)}!</h1>
      <p>Elegí una categoría, respondé antes de que termine el tiempo y sumá puntos.</p>
    </section>

    <section class="stat-grid" aria-label="Estadísticas personales">
      <article class="stat-card"><span class="stat-label">Partidas completadas</span>
        <strong class="stat-value">${stats.completedGames}</strong></article>
      <article class="stat-card"><span class="stat-label">Preguntas respondidas</span>
        <strong class="stat-value">${stats.totalQuestions}</strong></article>
      <article class="stat-card"><span class="stat-label">Acierto global</span>
        <strong class="stat-value">${stats.globalPercentage}%</strong></article>
      <article class="stat-card"><span class="stat-label">Puntaje más alto</span>
        <strong class="stat-value">${stats.highestScore}</strong></article>
      <article class="stat-card"><span class="stat-label">Mejor racha</span>
        <strong class="stat-value">${stats.bestStreak}</strong></article>
    </section>

    <div class="dashboard-grid">
      <section class="card">
        <p class="eyebrow">Nueva partida</p>
        <h2>¿Qué querés jugar?</h2>
        ${loader}
        <form id="start-game-form" class="form-stack">
          <div class="field">
            <label for="game-category">Categoría</label>
            <select id="game-category" name="category" required>${categories}</select>
          </div>
          <div class="field">
            <label for="question-count">Cantidad de preguntas</label>
            <select id="question-count" name="count" required>
              <option value="5">5 preguntas</option>
              <option value="10">10 preguntas</option>
            </select>
          </div>
          <button class="button" type="submit" ${loadStatus === "ready" ? "" : "disabled"}>
            Comenzar partida
          </button>
        </form>
      </section>

      <section class="card">
        <p class="eyebrow">Tu actividad</p>
        <h2>Seguí tu progreso</h2>
        <p class="muted">En total registraste ${summary.completadas} partidas completadas y
          ${summary.abandonadas} abandonadas. El puntaje acumulado en partidas completadas es
          ${summary.puntajeCompletadas} puntos.</p>
        <div class="button-row">
          <button class="button secondary" type="button" data-action="history">Ver historial</button>
          <button class="button secondary" type="button" data-action="category-stats">Aciertos por categoría</button>
          <button class="button secondary" type="button" data-action="ranking">Ver ranking</button>
        </div>
        <div class="button-row" style="margin-top: 20px">
          <button class="button link-button" type="button" data-action="logout">Cerrar sesión</button>
        </div>
      </section>
    </div>
  `;
}

/*
 * () -> String
 * Devuelve la pregunta actual, opciones, puntaje, avance y temporizador
 */
function renderGame() {
  if (!activeGame) {
    currentRoute = "dashboard";
    return renderDashboard();
  }

  const question = getCurrentQuestion();
  if (!question) {
    finishGame();
    return "";
  }

  const progress = Math.round((activeGame.currentIndex / activeGame.questionIds.length) * 100);
  const seconds = getRemainingSeconds();
  const options = question.options.map(function (option, index) {
    let className = "answer-option";
    if (activeGame.locked && index === question.correctIndex) className += " correct";
    if (activeGame.locked && activeGame.selectedIndex === index &&
        index !== question.correctIndex) className += " incorrect";

    return `
      <button class="${className}" type="button" data-action="answer" data-index="${index}"
        ${activeGame.locked ? "disabled" : ""}>
        <strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(option)}
      </button>
    `;
  }).join("");

  let feedback = "";
  if (activeGame.locked) {
    const correct = activeGame.selectedIndex === question.correctIndex;
    feedback = `
      <div class="notice ${correct ? "success" : "error"} feedback">
        ${activeGame.timedOut ? "Se terminó el tiempo." : (correct ? "¡Respuesta correcta!" : "Respuesta incorrecta.")}
        La respuesta correcta era: <strong>${escapeHtml(question.options[question.correctIndex])}</strong>.
        <div class="muted">La próxima pregunta aparecerá en unos segundos.</div>
      </div>
    `;
  }

  return `
    <section class="card question-card">
      <div class="game-topline">
        <div>
          <p class="eyebrow">${escapeHtml(activeGame.category)}</p>
          <h1>Pregunta ${activeGame.currentIndex + 1} de ${activeGame.questionIds.length}</h1>
          <p class="muted">Puntaje actual: <strong>${activeGame.score}</strong> puntos</p>
        </div>
        <div id="timer" class="timer ${seconds <= 5 ? "urgent" : ""}" aria-label="Tiempo restante">
          ${seconds}s
        </div>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>
      <h2>${escapeHtml(question.text)}</h2>
      <div class="answer-list">${options}</div>
      ${feedback}
      <div class="button-row">
        <button class="button secondary" type="button" data-action="ask-exit">Abandonar partida</button>
      </div>
      ${activeGame.showExitConfirm ? `
        <div class="confirm-panel" role="alert">
          <strong>¿Querés abandonar la partida?</strong>
          <p>Se guardará como abandonada y no contará para el ranking.</p>
          <div class="button-row">
            <button class="button danger" type="button" data-action="confirm-exit">Sí, abandonar</button>
            <button class="button secondary" type="button" data-action="cancel-exit">Seguir jugando</button>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

/*
 * () -> String
 * devuelve los resultados de la partida que acaba de terminar 
 */
function renderResults() {
  const game = games.find(function (item) {
    return item.id === (activeGame && activeGame.id);
  });

  if (!game) {
    return `<section class="card"><h1>Resultados</h1><p>No hay una partida para mostrar.</p>
      <button class="button" data-action="dashboard">Volver al menú</button></section>`;
  }

  const percentage = game.questionIds.length === 0
    ? 0
    : Math.round((game.correctCount / game.questionIds.length) * 100);

  return `
    <section class="card narrow">
      <p class="eyebrow">Partida finalizada</p>
      <h1>Tu resultado</h1>
      <div class="result-score">${game.score}</div>
      <p class="muted">puntos · ${escapeHtml(game.category)}</p>
      <p class="result-message">${performanceMessage(percentage)}</p>
      <div class="stat-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr))">
        <article class="stat-card"><span class="stat-label">Respuestas correctas</span>
          <strong class="stat-value">${game.correctCount}</strong></article>
        <article class="stat-card"><span class="stat-label">Respuestas incorrectas</span>
          <strong class="stat-value">${game.incorrectCount}</strong></article>
        <article class="stat-card"><span class="stat-label">Porcentaje de aciertos</span>
          <strong class="stat-value">${percentage}%</strong></article>
        <article class="stat-card"><span class="stat-label">Mejor racha</span>
          <strong class="stat-value">${game.bestStreak}</strong></article>
      </div>
      <p><strong>Duración:</strong> ${formatDuration(game.durationSeconds)}</p>
      <p><strong>Finalizada:</strong> ${formatDate(game.finishedAt)}</p>
      <div class="button-row">
        <button class="button" type="button" data-action="dashboard">Volver al menú</button>
        <button class="button secondary" type="button" data-action="new-game">Iniciar otra partida</button>
      </div>
    </section>
  `;
}

/*
 * () -> String
 * devuelve una tabla con el historial y filtros de categoría y estado.
 */
function renderHistory() {
  const history = getUserGames(getCurrentUser().username);
  const categories = getCategories().map(function (category) {
    return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
  }).join("");

  return `
    <section class="card">
      <div class="section-heading">
        <div><p class="eyebrow">Tus partidas</p><h1>Historial</h1></div>
        <button class="button secondary" type="button" data-action="dashboard">Volver al menú</button>
      </div>
      <div class="toolbar">
        <div class="field">
          <label for="history-category">Categoría</label>
          <select id="history-category" class="filter-select">
            <option value="">Todas</option>${categories}
          </select>
        </div>
        <div class="field">
          <label for="history-status">Estado</label>
          <select id="history-status" class="filter-select">
            <option value="">Todos</option>
            <option value="completed">Completada</option>
            <option value="abandoned">Abandonada</option>
          </select>
        </div>
      </div>
      <div id="history-content">${historyTable(history)}</div>
    </section>
  `;
}

/*
 * Array<Game> -> String
 * convierte las partidas recibidas en una tabla o en un mensaje vacío
 */
function historyTable(history) {
  if (history.length === 0) {
    return `<div class="empty-state">Todavía no hay resultados disponibles para esos filtros.</div>`;
  }

  const rows = history.map(function (game) {
    const status = game.status === "completed" ? "Completada" : "Abandonada";
    return `<tr>
      <td>${formatDate(game.finishedAt || game.startedAt)}</td>
      <td>${escapeHtml(game.category)}</td>
      <td>${game.score}</td>
      <td>${game.correctCount}</td>
      <td>${status}</td>
    </tr>`;
  }).join("");

  return `<div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Categoría</th><th>Puntaje</th><th>Correctas</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/*
 * () -> String
 * devuelve los diez mejores resultados de partidas completadas
 */
function renderRanking() {
  const ranking = games
    // filter: solo las partidas completadas ("completed")
    .filter(function (game) {
      return game.status === "completed";
    })
    // sort: mayor puntaje primero
    .sort(function (first, second) {
      if (second.score !== first.score) return second.score - first.score;
      if (first.durationSeconds !== second.durationSeconds) {
        return first.durationSeconds - second.durationSeconds;
        // si empatan, menor duración primero
      }
      return new Date(first.finishedAt) - new Date(second.finishedAt);
      // si persiste el empate va la fecha más antigua primero
    })
    .slice(0, 10);
    // para conservar los primeros 10

  const rows = ranking.map(function (game, index) {
    // construye una fila para cada resultado del ranking
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(game.username)}</td>
      <td>${game.score}</td>
      <td>${escapeHtml(game.category)}</td>
      <td>${formatDate(game.finishedAt)}</td>
    </tr>`;
  }).join("");

  return `
    <section class="card">
      <div class="section-heading">
        <div><p class="eyebrow">Mejores partidas completadas</p><h1>Ranking</h1></div>
        <button class="button secondary" type="button" data-action="dashboard">Volver al menú</button>
      </div>
      ${ranking.length === 0
        ? `<div class="empty-state">Todavía no hay partidas completadas para mostrar.</div>`
        : `<div class="table-wrap"><table>
          <thead><tr><th>Posición</th><th>Usuario</th><th>Puntaje</th><th>Categoría</th><th>Fecha</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`}
    </section>
  `;
}

/*
 * () -> String
 * devuelve el selector y el resultado del porcentaje por categoría
 */
function renderCategoryStats() {
  const history = getUserGames(getCurrentUser().username);
  const categories = getCategories();
  const options = categories.map(function (category) {
    return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
  }).join("");

  const selectedCategory = new URLSearchParams(window.location.search).get("category") || categories[0];
  const result = calcularEstadisticaCategoria(history, selectedCategory);

  return `
    <section class="card narrow">
      <div class="section-heading">
        <div><p class="eyebrow">Análisis de respuestas</p><h1>Aciertos por categoría</h1></div>
      </div>
      <div class="field">
        <label for="category-stat-select">Categoría</label>
        <select id="category-stat-select">${options}</select>
      </div>
      <div class="notice">
        En <strong>${escapeHtml(selectedCategory)}</strong> respondiste correctamente
        <strong>${result.percentage}%</strong> de las preguntas registradas
        (${result.correct} de ${result.total}).
      </div>
      <div class="button-row" style="margin-top: 18px">
        <button class="button secondary" type="button" data-action="dashboard">Volver al menú</button>
      </div>
    </section>
  `;
}

// VALIDACIÓN Y PROCESO DE REGISTRO
/*
 * String, String, String, String -> String
 * valida los campos del registro y devuelve el primer mensaje de error o una cadena vacía.
 */
function validateRegistration(username, email, password, confirmPassword) {
  if (!username || !email || !password || !confirmPassword) {
    return "Completá todos los campos.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ingresá un correo electrónico válido.";
  }
  if (username.length < 4 || username.length > 16) {
    return "El nombre de usuario debe tener entre 4 y 16 caracteres.";
  }
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (password !== confirmPassword) {
    return "La contraseña y su confirmación no coinciden.";
  }
  if (users.some(function (user) {
    return user.username.toLowerCase() === username.toLowerCase();
  })) {
    return "Ya existe un usuario con ese nombre.";
  }
  if (users.some(function (user) {
    return user.email.toLowerCase() === email.toLowerCase();
  })) {
    return "Ya existe una cuenta con ese correo electrónico.";
  }
  return "";
}

/*
 * String, String, String, String -> Boolean
 * valida, guarda y confirma un registro; devuelve true si creó la cuenta
 */
function registerUser(username, email, password, confirmPassword) {
  const errorMessage = validateRegistration(username, email, password, confirmPassword);
  if (errorMessage) {
    showFormMessage(errorMessage, "error");
    return false;
  }

  const newUser = {
    username: username.trim(),
    email: email.trim(),
    password: password
  };

  users.push(newUser);
  if (!writeStorage(STORAGE_KEYS.users, users)) {
    users.pop();
    showFormMessage("No se pudo guardar la cuenta en este navegador.", "error");
    return false;
  }

  showFormMessage("La cuenta se creó correctamente. Ya podés iniciar sesión.", "success");
  document.querySelector("#register-form").reset();
  return true;
}

/*
 * String, String -> Boolean
 * INICIO DE SESIÓN Y MENSAJES QUE SE MUESTRAN AL USUARIO
 * comprueba las credenciales e inicia una sesión si son correctas.
 * find busca una cuenta que coincida con el nombre y la contraseña
 * showFormMessage localiza el espacio del mensaje y presenta el texto
 */
function loginUser(username, password) {
  const matchedUser = users.find(function (user) {
    return user.username.toLowerCase() === username.trim().toLowerCase() &&
      user.password === password;
  });

  if (!matchedUser) {
    showFormMessage("El nombre de usuario o la contraseña son incorrectos.", "error");
    return false;
  }

  session = { username: matchedUser.username };
  writeStorage(STORAGE_KEYS.session, session);
  loadStatus = "idle";
  navigate("dashboard");
  return true;
}

/*
 * String, String -> ()
 * Muestra un mensaje de formulario usando un estilo de éxito o error
 */
function showFormMessage(message, type) {
  const target = document.querySelector("#form-message");
  if (!target) return;
  target.innerHTML = `<p class="notice ${type}">${escapeHtml(message)}</p>`;
}

/*
 * String, Number -> Array<Question> | null
 * Elige preguntas aleatorias sin repetición; null indica que no hay suficientes
 * (como está harcodeado, hay más de 10 preguntas para que puedan ser aleatorias y alcancen, pero hay que contemplar posibles errores también)
 * Se usa una copia (available.slice()) para mezclar sin alterar el banco original
 */
function selectQuestions(category, count) {
  const available = QUESTIONS.filter(function (question) {
    return question.category === category;
  });

  if (available.length < count) return null;

  // mezcla el array
  const shuffled = available.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

/*
 * String, Number -> Boolean
 * valida cantidad y disponibilidad de preguntas antes de guardar e iniciar la partida.
 */
function startNewGame(category, count) {
  const selectedQuestions = selectQuestions(category, count);
  if (!selectedQuestions) {
    window.alert(`No hay ${count} preguntas disponibles en la categoría ${category}.`);
    return false;
  }

  const user = getCurrentUser();
  const now = Date.now();

  activeGame = {
    id: createId(),
    username: user.username,
    category: category,
    questionIds: selectedQuestions.map(function (question) {
      return question.id;
    }),
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    answers: [],
    status: "in-progress",
    startedAt: now,
    deadline: now + 15000,
    locked: false,
    selectedIndex: null,
    timedOut: false,
    showExitConfirm: false
  };

  games.push({
    id: activeGame.id,
    username: activeGame.username,
    category: activeGame.category,
    questionIds: activeGame.questionIds,
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    answers: [],
    status: "in-progress",
    startedAt: now,
    finishedAt: null,
    durationSeconds: 0
  });

  saveGames();
  writeStorage(STORAGE_KEYS.activeGame, activeGame);
  // crea activeGame con puntaje, rachas, rtas. y tiempo inicial
  // agrega un registro de partida y lo guarda
  navigate("game");
  return true;
}

/*
 * () -> Question | null
 * encuentra la pregunta actual a partir de su identificador
 */
function getCurrentQuestion() {
  if (!activeGame) return null;
  const questionId = activeGame.questionIds[activeGame.currentIndex];
  return QUESTIONS.find(function (question) {
    return question.id === questionId;
  }) || null;
}

/*
 * () -> Number
 * calcula los segundos que quedan hasta el límite de la pregunta actual
 */
function getRemainingSeconds() {
  if (!activeGame || !activeGame.deadline) return 0;
  return Math.max(0, Math.ceil((activeGame.deadline - Date.now()) / 1000));
}

/*
 * () -> ()
 * actualiza el temporizador en pantalla, osea que elimina cualquier intervalo anterior, para evitar dos relojes a la vez
 * registra como "vencida" una pregunta sin respuesta, es decir, la toma como incorrecta
 */
function startTimer() {
  window.clearInterval(timerInterval);
  if (!activeGame || activeGame.locked) return;

  timerInterval = window.setInterval(function () {
    if (!activeGame || activeGame.locked) {
      window.clearInterval(timerInterval);
      return;
    }

    const remaining = getRemainingSeconds();
    const timer = document.querySelector("#timer");
    if (timer) {
      timer.textContent = `${remaining}s`;
      timer.classList.toggle("urgent", remaining <= 5);
    }

    if (remaining <= 0) {
      submitAnswer(null, true);
    }
  }, 200);
}

/*
 * Number | null, Boolean -> None
 * Registra la respuesta o el vencimiento, actualiza racha y puntaje, y bloquea la pregunta.
 */
function submitAnswer(selectedIndex, timedOut) {
  if (!activeGame || activeGame.locked) return;

  window.clearInterval(timerInterval);
  const question = getCurrentQuestion();
  if (!question) return;

  const isCorrect = selectedIndex === question.correctIndex && !timedOut;
  activeGame.locked = true;
    // guarda la respuesta y actualiza conteos y rachas
    // persiste los cambios y muestra la rta. correcta

  activeGame.selectedIndex = selectedIndex;
  activeGame.timedOut = timedOut;
  activeGame.answers.push({
    questionId: question.id,
    selectedIndex: selectedIndex,
    correct: isCorrect,
    timedOut: timedOut,
    answeredAt: Date.now()
  });

  if (isCorrect) {
    activeGame.correctCount += 1;
    activeGame.score += question.points;
    activeGame.currentStreak += 1;
    activeGame.bestStreak = Math.max(activeGame.bestStreak, activeGame.currentStreak);
  } else {
    activeGame.incorrectCount += 1;
    activeGame.currentStreak = 0;
  }

  syncActiveGameToRecord();
  persistActiveGame();
  render();

  activeGame.advanceAt = Date.now() + 2000;
  persistActiveGame();
  resumeAdvance();
}

/*
 * () -> ()
 * persiste el progreso temporal de la partida activa para recuperarlo tras actualizar
 */
function persistActiveGame() {
  if (activeGame) writeStorage(STORAGE_KEYS.activeGame, activeGame);
}

// () -> ()
function syncActiveGameToRecord() {
  if (!activeGame) return;

  const record = games.find(function (game) {
    return game.id === activeGame.id;
  });
  if (!record) return;
  // copia al registro los puntos, respuestas, rachas y estado.
  
  record.score = activeGame.score;
  record.correctCount = activeGame.correctCount;
  record.incorrectCount = activeGame.incorrectCount;
  record.currentStreak = activeGame.currentStreak;
  record.bestStreak = activeGame.bestStreak;
  record.answers = activeGame.answers.slice();
  record.currentIndex = activeGame.currentIndex;
  record.status = activeGame.status;
  saveGames();
}

/*
 * () -> ()
 * Reanuda el avance automático de una pregunta bloqueada, incluso tras una recarga
 */
function resumeAdvance() {
  window.clearTimeout(advanceTimeout);
  if (!activeGame || !activeGame.locked) return;

  const delay = Math.max(0, (activeGame.advanceAt || Date.now() + 2000) - Date.now());
  advanceTimeout = window.setTimeout(function () {
    // setTimeout programa una sola acción futura, a diferencia de setInterval, que se repite

    if (!activeGame) return;
    activeGame.currentIndex += 1;
    // si quedan preguntas, prepara la siguiente.
    // si no quedan, finaliza la partida.
    activeGame.locked = false;
    activeGame.selectedIndex = null;
    activeGame.timedOut = false;

    if (activeGame.currentIndex >= activeGame.questionIds.length) {
      finishGame();
      return;
    }

    activeGame.deadline = Date.now() + 15000;
    delete activeGame.advanceAt;
    persistActiveGame();
    render();
  }, delay);
}

// TERMINA LA PARTIDA O SE ABANDONA

/*
 * () -> ()
 * finaliza la partida y la guarda como completada con duración y fecha.
 * esta función se llama cuando ya NO quedan preguntas
 */
function finishGame() {
    // busca el registro de la partida y le asigna status: "completed", finishedAt, durationSeconds y resultados.

  if (!activeGame) return;

  activeGame.status = "completed";
  const finishedAt = Date.now();
  const record = games.find(function (game) {
    return game.id === activeGame.id;
  });

  if (record) {
    record.status = "completed";
    record.finishedAt = finishedAt;
    record.durationSeconds = Math.round((finishedAt - activeGame.startedAt) / 1000);
    record.score = activeGame.score;
    record.correctCount = activeGame.correctCount;
    record.incorrectCount = activeGame.incorrectCount;
    record.bestStreak = activeGame.bestStreak;
    record.answers = activeGame.answers.slice();
    record.questionIds = activeGame.questionIds.slice();
  }

  saveGames();
  persistActiveGame();
  currentRoute = "results";
  render();
}

/*
 * () -> ()
 * guarda la partida como abandonada y la excluye del ranking.
 */
function abandonGame() {
    // detiene reloj y avance.
    // guarda status: "abandoned" y su duración, elimina la partida activa y vuelve al menú.

  if (!activeGame) return;

  window.clearInterval(timerInterval);
  window.clearTimeout(advanceTimeout);

  const finishedAt = Date.now();
  const record = games.find(function (game) {
    return game.id === activeGame.id;
  });

  if (record) {
    record.status = "abandoned";
    record.finishedAt = finishedAt;
    record.durationSeconds = Math.round((finishedAt - activeGame.startedAt) / 1000);
    record.score = activeGame.score;
    record.correctCount = activeGame.correctCount;
    record.incorrectCount = activeGame.incorrectCount;
    record.bestStreak = activeGame.bestStreak;
    record.answers = activeGame.answers.slice();
  }

  activeGame.status = "abandoned";
  saveGames();
  localStorage.removeItem(STORAGE_KEYS.activeGame);
  activeGame = null;
  navigate("dashboard");
}

/*
 * () -> Boolean
 * guarda el conjunto de partidas
 */
function saveGames() {
  return writeStorage(STORAGE_KEYS.games, games);
}

/*
 * String -> ()
 * esta función lee los filtros elegidos, obtiene el historial del usuario y conserva partidas que coinciden.
 * la condición !category significa que no hay que aplicar filtros de categoría ya que no se seleccionó ninguno.
 * lo mismo aplica al estado
 */
function applyHistoryFilters() {
  const category = document.querySelector("#history-category").value;
  const status = document.querySelector("#history-status").value;
  const history = getUserGames(getCurrentUser().username).filter(function (game) {
    return (!category || game.category === category) &&
      (!status || game.status === status);
  });

  document.querySelector("#history-content").innerHTML = historyTable(history);
  // historyTable transforma la lista filtrada en HTML
}


// FORMULARIOS Y EVENTOS

/*
 * Event -> ()
 * atiende los envíos de formularios de registro, inicio de sesión y partida
 */
function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.id === "register-form") {
    event.preventDefault();
    const data = new FormData(form);
    registerUser(
      String(data.get("username") || "").trim(),
      String(data.get("email") || "").trim(),
      String(data.get("password") || ""),
      String(data.get("confirmPassword") || "")
    );
    return;
  }

  if (form.id === "login-form") {
    event.preventDefault();
    const data = new FormData(form);
    loginUser(
      String(data.get("username") || ""),
      String(data.get("password") || "")
    );
    return;
  }

  if (form.id === "start-game-form") {
    event.preventDefault();
    if (loadStatus !== "ready") return;
    const data = new FormData(form);
    startNewGame(String(data.get("category")), Number(data.get("count")));
  }
}

/*
 * Event -> ()
 * atiende botones, respuestas, navegación, carga de datos y cierre de sesión.
 */
function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "go-login") {
    event.preventDefault();
    navigate("login");
  } else if (action === "go-register") {
    event.preventDefault();
    navigate("register");
  } else if (action === "dashboard" || action === "home") {
    event.preventDefault();
    navigate("dashboard");
  } else if (action === "history") {
    navigate("history");
  } else if (action === "ranking") {
    navigate("ranking");
  } else if (action === "category-stats") {
    navigate("category-stats");
  } else if (action === "retry-load") {
    prepareQuestionBank();
  } else if (action === "answer") {
    submitAnswer(Number(button.dataset.index), false);
  } else if (action === "ask-exit") {
    activeGame.showExitConfirm = true;
    persistActiveGame();
    render();
  } else if (action === "cancel-exit") {
    activeGame.showExitConfirm = false;
    persistActiveGame();
    render();
  } else if (action === "confirm-exit") {
    abandonGame();
  } else if (action === "logout") {
    logout();
  } else if (action === "new-game") {
    activeGame = null;
    localStorage.removeItem(STORAGE_KEYS.activeGame);
    navigate("dashboard");
  }
}

/*
 * () -> ()
 * elimina la sesión activa y vuelve al formulario de inicio de sesión
 */
function logout() {
  session = null;
  writeStorage(STORAGE_KEYS.session, null);
  activeGame = null;
  localStorage.removeItem(STORAGE_KEYS.activeGame);
  loadStatus = "idle";
  navigate("login");
}

/*
 * Event -> ()
 * cambia el porcentaje mostrado cuando se elige otra categoría.
 */
function handleChange(event) {
  if (event.target.id === "history-category" || event.target.id === "history-status") {
    applyHistoryFilters();
    return;
  }

  if (event.target.id === "category-stat-select") {
    const category = encodeURIComponent(event.target.value);
    const basePath = window.location.pathname;
    window.history.replaceState({}, "", `${basePath}?category=${category}`);
    render();
    document.querySelector("#category-stat-select").value = event.target.value;
  }
}

/*
 * () -> ()
 * esta función prepara el estado inicial y conecta los eventos de la aplicación,
 * después decide qué pantalla corresponde y la dibuja.
 * La última línea ejecuta la inicialización
 */
function initializeApp() {
  if (!Array.isArray(users)) users = [];
  if (!Array.isArray(games)) games = [];
  writeStorage(STORAGE_KEYS.users, users);
  writeStorage(STORAGE_KEYS.games, games);

  if (activeGame && (!session || activeGame.username !== session.username)) {
    activeGame = null;
    localStorage.removeItem(STORAGE_KEYS.activeGame);
  }

  app.addEventListener("submit", handleSubmit);
  app.addEventListener("click", handleClick);
  app.addEventListener("change", handleChange);

  currentRoute = getInitialRoute();
  render();

  if (currentRoute === "dashboard") {
    prepareQuestionBank();
  }
}

initializeApp();