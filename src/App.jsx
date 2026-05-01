import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import WorldMapPixi from './components/WorldMapPixi';
import stories from './data/stories.json';

const emptyAnswers = {};
const progressStorageKey = 'lectura-amaiur-progress';
const pokemonCacheKey = 'lectura-amaiur-pokemon-cache';
const pokemonRewardIds = [25, 1, 4, 7, 133, 39, 52, 54];

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAnswerCorrect(question, answer) {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return answer === question.correctAnswer;
  }

  if (question.type === 'matching') {
    if (!answer) return false;
    return question.pairs.every((pair) => answer[pair.left] === pair.right);
  }

  if (question.type === 'short_text') {
    const normalized = normalizeText(answer);
    return question.acceptedAnswers.some(
      (accepted) => normalizeText(accepted) === normalized,
    );
  }

  return false;
}

function getScore(story, answers) {
  return story.questions.reduce((total, question) => {
    return total + (isAnswerCorrect(question, answers[question.id]) ? 1 : 0);
  }, 0);
}

function getStars(score, totalQuestions) {
  if (!totalQuestions) return 0;

  const ratio = score / totalQuestions;
  if (ratio === 1) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

function loadStoredProgress() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(progressStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredProgress(progress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
}

function loadPokemonCache() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(pokemonCacheKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePokemonCache(cache) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(pokemonCacheKey, JSON.stringify(cache));
}

function formatPokemonName(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanFlavorText(value) {
  return value.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPokemonReward(id) {
  const [pokemonResponse, speciesResponse] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  if (!pokemonResponse.ok || !speciesResponse.ok) {
    throw new Error('No se pudo cargar el Pokémon');
  }

  const pokemon = await pokemonResponse.json();
  const species = await speciesResponse.json();

  const spanishName =
    species.names.find((entry) => entry.language.name === 'es')?.name ??
    formatPokemonName(pokemon.name);

  const spanishDescription =
    species.flavor_text_entries.find((entry) => entry.language.name === 'es')
      ?.flavor_text ??
    species.flavor_text_entries.find((entry) => entry.language.name === 'en')
      ?.flavor_text ??
    'Pokémon misterioso desbloqueado por tu avance.';

  return {
    id,
    name: spanishName,
    description: cleanFlavorText(spanishDescription),
    image:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default,
  };
}

function formatBestLabel(progressEntry, totalQuestions) {
  if (!progressEntry) return '0/' + totalQuestions;
  return `${progressEntry.bestScore}/${totalQuestions}`;
}

function getStoryStatus(index, progressByStory) {
  if (index === 0) return 'available';

  const previousStory = stories[index - 1];
  const previousProgress = progressByStory[previousStory.id];

  if (previousProgress?.bestScore > 0) return 'available';
  return 'locked';
}

function App() {
  const [screen, setScreen] = useState('home');
  const [selectedStoryId, setSelectedStoryId] = useState(stories[0]?.id ?? null);
  const [answersByStory, setAnswersByStory] = useState({});
  const [submittedStories, setSubmittedStories] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [progressByStory, setProgressByStory] = useState(loadStoredProgress);
  const [pokemonCache, setPokemonCache] = useState(loadPokemonCache);
  const [pokemonLoading, setPokemonLoading] = useState(false);
  const [pokemonError, setPokemonError] = useState('');

  useEffect(() => {
    saveStoredProgress(progressByStory);
  }, [progressByStory]);

  useEffect(() => {
    savePokemonCache(pokemonCache);
  }, [pokemonCache]);

  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ?? stories[0];
  const selectedIllustration = selectedStory?.illustration;
  const currentAnswers = answersByStory[selectedStory?.id] ?? emptyAnswers;
  const currentProgress = progressByStory[selectedStory?.id];
  const isSubmitted = submittedStories[selectedStory?.id] ?? false;

  const score = useMemo(() => {
    if (!selectedStory) return 0;
    return getScore(selectedStory, currentAnswers);
  }, [currentAnswers, selectedStory]);

  const worldProgress = useMemo(() => {
    return stories.map((story, index) => {
      const progress = progressByStory[story.id];
      const status = getStoryStatus(index, progressByStory);
      const isCompleted = (progress?.bestScore ?? 0) > 0;

      return {
        story,
        progress,
        status,
        isCompleted,
        stars: progress?.bestStars ?? 0,
      };
    });
  }, [progressByStory]);

  const profileStats = useMemo(() => {
    return worldProgress.reduce(
      (totals, entry) => {
        totals.totalStars += entry.stars;
        totals.completed += entry.isCompleted ? 1 : 0;
        totals.attempts += entry.progress?.attempts ?? 0;
        if ((entry.progress?.bestScore ?? 0) === entry.story.questions.length) {
          totals.perfect += 1;
        }
        return totals;
      },
      { totalStars: 0, completed: 0, attempts: 0, perfect: 0 },
    );
  }, [worldProgress]);

  const unlockedPokemonCount = useMemo(() => {
    return Math.min(Math.floor(profileStats.totalStars / 2), pokemonRewardIds.length);
  }, [profileStats.totalStars]);

  const nextPokemonTarget = useMemo(() => {
    const nextUnlockIndex = unlockedPokemonCount;
    if (nextUnlockIndex >= pokemonRewardIds.length) return null;

    return {
      starsNeeded: (nextUnlockIndex + 1) * 2,
      remainingStars: Math.max(0, (nextUnlockIndex + 1) * 2 - profileStats.totalStars),
    };
  }, [profileStats.totalStars, unlockedPokemonCount]);

  const unlockedPokemon = useMemo(() => {
    return pokemonRewardIds
      .slice(0, unlockedPokemonCount)
      .map((id) => pokemonCache[id])
      .filter(Boolean);
  }, [pokemonCache, unlockedPokemonCount]);

  useEffect(() => {
    const idsToLoad = pokemonRewardIds
      .slice(0, unlockedPokemonCount)
      .filter((id) => !pokemonCache[id]);

    if (idsToLoad.length === 0) return;

    let ignore = false;

    async function loadRewards() {
      setPokemonLoading(true);
      setPokemonError('');

      try {
        const loadedRewards = await Promise.all(
          idsToLoad.map(async (id) => {
            const reward = await fetchPokemonReward(id);
            return [id, reward];
          }),
        );

        if (ignore) return;

        setPokemonCache((current) => {
          const next = { ...current };
          for (const [id, reward] of loadedRewards) {
            next[id] = reward;
          }
          return next;
        });
      } catch {
        if (!ignore) {
          setPokemonError('No se pudieron cargar las recompensas Pokémon.');
        }
      } finally {
        if (!ignore) {
          setPokemonLoading(false);
        }
      }
    }

    loadRewards();

    return () => {
      ignore = true;
    };
  }, [pokemonCache, unlockedPokemonCount]);

  function openStory(storyId) {
    setSelectedStoryId(storyId);
    setActiveTab(0);
    setScreen('lesson');
  }

  function updateAnswer(questionId, value) {
    setAnswersByStory((current) => ({
      ...current,
      [selectedStory.id]: {
        ...(current[selectedStory.id] ?? {}),
        [questionId]: value,
      },
    }));
  }

  function updateMatchingAnswer(questionId, leftKey, value) {
    const currentValue = currentAnswers[questionId] ?? {};

    updateAnswer(questionId, {
      ...currentValue,
      [leftKey]: value,
    });
  }

  function handleSubmit() {
    const totalQuestions = selectedStory.questions.length;
    const stars = getStars(score, totalQuestions);

    setSubmittedStories((current) => ({
      ...current,
      [selectedStory.id]: true,
    }));

    setProgressByStory((current) => {
      const previous = current[selectedStory.id] ?? {
        attempts: 0,
        bestScore: 0,
        bestStars: 0,
      };

      return {
        ...current,
        [selectedStory.id]: {
          attempts: previous.attempts + 1,
          bestScore: Math.max(previous.bestScore, score),
          bestStars: Math.max(previous.bestStars, stars),
          lastScore: score,
          lastStars: stars,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function handleReset() {
    setAnswersByStory((current) => ({
      ...current,
      [selectedStory.id]: {},
    }));
    setSubmittedStories((current) => ({
      ...current,
      [selectedStory.id]: false,
    }));
  }

  function resetAllProgress() {
    setProgressByStory({});
    setSubmittedStories({});
    setAnswersByStory({});
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(progressStorageKey);
    }
  }

  if (!selectedStory) {
    return <main className="app-shell">No hay cuentos cargados todavía.</main>;
  }

  if (screen === 'home') {
    return (
      <main className="app-shell">
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow">Mapa de aventura</p>
            <h1>Lectura Amaiur</h1>
            <p className="hero-text">
              Explora cuentos, gana estrellas y desbloquea nuevos retos como en
              un videojuego.
            </p>
          </div>

          <div className="player-panel">
            <span className="player-badge">Aventurera lectora</span>
            <div className="player-stats">
              <div>
                <span className="progress-label">Estrellas</span>
                <strong>{profileStats.totalStars}</strong>
              </div>
              <div>
                <span className="progress-label">Cuentos superados</span>
                <strong>
                  {profileStats.completed}/{stories.length}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="progress-strip">
          <Paper className="progress-card" elevation={0}>
            <span className="progress-label">Intentos totales</span>
            <strong>{profileStats.attempts}</strong>
          </Paper>
          <Paper className="progress-card" elevation={0}>
            <span className="progress-label">Plenos</span>
            <strong>{profileStats.perfect}</strong>
          </Paper>
          <Paper className="progress-card" elevation={0}>
            <span className="progress-label">Nivel actual</span>
            <strong>{profileStats.completed + 1}</strong>
          </Paper>
          <Paper className="progress-card" elevation={0}>
            <span className="progress-label">Ruta activa</span>
            <strong>Biblioteca</strong>
          </Paper>
        </section>

        <section className="pokemon-rewards">
          <div className="map-header">
            <div>
              <p className="eyebrow">Recompensas Pokémon</p>
              <h2>Tu equipo de lectura</h2>
              <p className="pokemon-subtitle">
                Se desbloquea un Pokémon nuevo cada 2 estrellas.
              </p>
            </div>
          </div>

          <div className="pokemon-summary">
            <Paper className="pokemon-summary-card" elevation={0}>
              <span className="progress-label">Pokémon desbloqueados</span>
              <strong>
                {unlockedPokemon.length}/{pokemonRewardIds.length}
              </strong>
            </Paper>
            <Paper className="pokemon-summary-card" elevation={0}>
              <span className="progress-label">Próximo desbloqueo</span>
              <strong>
                {nextPokemonTarget
                  ? `${nextPokemonTarget.remainingStars} estrella(s)`
                  : 'Todos conseguidos'}
              </strong>
            </Paper>
          </div>

          {pokemonError ? <p className="pokemon-message">{pokemonError}</p> : null}
          {pokemonLoading ? (
            <p className="pokemon-message">Cargando recompensas Pokémon...</p>
          ) : null}

          <div className="pokemon-grid">
            {pokemonRewardIds.map((id, index) => {
              const isUnlocked = index < unlockedPokemonCount;
              const reward = pokemonCache[id];

              return (
                <article
                  key={id}
                  className={`pokemon-card ${isUnlocked ? 'pokemon-open' : 'pokemon-locked'}`}
                >
                  <div className="pokemon-image-wrap">
                    {isUnlocked && reward?.image ? (
                      <img src={reward.image} alt={reward.name} className="pokemon-image" />
                    ) : (
                      <div className="pokemon-placeholder">?</div>
                    )}
                  </div>

                  <h3>{isUnlocked ? reward?.name ?? `Pokémon #${id}` : 'Pokémon oculto'}</h3>
                  <p>
                    {isUnlocked
                      ? reward?.description ?? 'Recompensa de lectura desbloqueada.'
                      : `Consigue ${(index + 1) * 2} estrellas para desbloquearlo.`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="world-map">
          <div className="map-header">
            <div>
              <p className="eyebrow">Camino de cuentos</p>
              <h2>Elige tu siguiente nivel</h2>
            </div>
            <Button className="ghost-button" variant="text" onClick={resetAllProgress}>
              Reiniciar progreso
            </Button>
          </div>

          <div className="desktop-map">
            <WorldMapPixi
              worldProgress={worldProgress}
              unlockedPokemon={unlockedPokemon}
              onOpenStory={openStory}
            />
          </div>

          <div className="level-list">
            {worldProgress.map((entry, index) => {
              const isLocked = entry.status === 'locked';

              return (
                <button
                  key={entry.story.id}
                  type="button"
                  className={`level-list-card ${
                    entry.isCompleted ? 'level-completed' : 'level-open'
                  } ${isLocked ? 'level-locked' : ''}`}
                  onClick={() => !isLocked && openStory(entry.story.id)}
                  disabled={isLocked}
                >
                  <span className="level-list-number">{index + 1}</span>
                  <div className="level-list-content">
                    <span className="story-tag">{entry.story.category}</span>
                    <h3>{entry.story.title}</h3>
                    <p>{entry.story.summary}</p>
                    <div className="level-meta">
                      <span>
                        Mejor: {formatBestLabel(entry.progress, entry.story.questions.length)}
                      </span>
                      <span className="stars-row">
                        {'★'.repeat(entry.stars)}
                        {'☆'.repeat(3 - entry.stars)}
                      </span>
                    </div>
                    <span className={`status-pill status-${entry.status}`}>
                      {isLocked
                        ? 'Bloqueado'
                        : entry.isCompleted
                          ? 'Completado'
                          : 'Disponible'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero hero-lesson">
        <div>
          <Button className="back-button" variant="text" onClick={() => setScreen('home')}>
            Volver al mapa
          </Button>
          <p className="eyebrow">Lectura y comprensión</p>
          <h1>{selectedStory.title}</h1>
          <p className="hero-text">
            Lee el cuento con calma y después responde las {selectedStory.questions.length}{' '}
            preguntas.
          </p>
        </div>

        <FormControl className="story-picker" size="medium">
          <InputLabel id="story-select-label">Elegir cuento</InputLabel>
          <Select
            labelId="story-select-label"
            value={selectedStory.id}
            label="Elegir cuento"
            onChange={(event) => setSelectedStoryId(event.target.value)}
          >
            {worldProgress
              .filter((entry, index) => getStoryStatus(index, progressByStory) !== 'locked')
              .map((entry) => (
                <MenuItem key={entry.story.id} value={entry.story.id}>
                  {entry.story.title}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </section>

      <Paper className="tabs-shell" elevation={0}>
        <Box className="tabs-header">
          <div className="title-row">
            <div>
              <Typography className="story-tag">{selectedStory.category}</Typography>
              <Typography variant="h4" className="tab-title">
                {selectedStory.title}
              </Typography>
              <Typography className="story-summary">
                {selectedStory.summary}
              </Typography>
            </div>

            <div className="story-progress-badge">
              <span className="progress-label">Mejor puntuación</span>
              <strong>
                {formatBestLabel(currentProgress, selectedStory.questions.length)}
              </strong>
              <span className="stars-row">
                {'★'.repeat(currentProgress?.bestStars ?? 0)}
                {'☆'.repeat(3 - (currentProgress?.bestStars ?? 0))}
              </span>
            </div>
          </div>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          className="material-tabs"
          variant="fullWidth"
        >
          <Tab label="Cuento" />
          <Tab label={`Preguntas (${selectedStory.questions.length})`} />
        </Tabs>

        {activeTab === 0 ? (
          <Box className="tab-panel">
            <article className="story-card">
              {selectedIllustration ? (
                <figure className="story-illustration">
                  <img
                    src={selectedIllustration.src}
                    alt={selectedIllustration.alt}
                  />
                  <figcaption>
                    {selectedIllustration.caption}:{' '}
                    <a
                      href={selectedIllustration.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedIllustration.sourceLabel}
                    </a>
                  </figcaption>
                </figure>
              ) : null}

              <div className="story-text">
                {selectedStory.content.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          </Box>
        ) : null}

        {activeTab === 1 ? (
          <Box className="tab-panel">
            <section className="quiz-card">
              <div className="quiz-header">
                <div>
                  <p className="story-tag">Preguntas</p>
                  <h2>Comprensión lectora</h2>
                </div>
                {isSubmitted ? (
                  <div className="score-box">
                    {score} / {selectedStory.questions.length}
                  </div>
                ) : (
                  <div className="score-box score-box-muted">
                    Mejor: {currentProgress?.bestScore ?? 0}
                  </div>
                )}
              </div>

              <div className="lesson-summary">
                <div className="lesson-chip">
                  Último resultado: {currentProgress?.lastScore ?? 0}/
                  {selectedStory.questions.length}
                </div>
                <div className="lesson-chip">
                  Intentos: {currentProgress?.attempts ?? 0}
                </div>
              </div>

              <div className="questions">
                {selectedStory.questions.map((question, index) => {
                  const answer = currentAnswers[question.id];
                  const correct = isSubmitted
                    ? isAnswerCorrect(question, answer)
                    : null;

                  return (
                    <article
                      key={question.id}
                      className={`question-card ${
                        isSubmitted
                          ? correct
                            ? 'question-correct'
                            : 'question-wrong'
                          : ''
                      }`}
                    >
                      <p className="question-number">
                        {index + 1}. {question.prompt}
                      </p>

                      <QuestionRenderer
                        question={question}
                        answer={answer}
                        onChange={updateAnswer}
                        onMatchingChange={updateMatchingAnswer}
                      />

                      {isSubmitted ? (
                        <p className={`feedback ${correct ? 'ok' : 'bad'}`}>
                          {correct
                            ? 'Correcta'
                            : `Respuesta correcta: ${question.explanation}`}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="actions">
                <Button className="primary-button" variant="contained" onClick={handleSubmit}>
                  Corregir y guardar
                </Button>
                <Button className="secondary-button" variant="outlined" onClick={handleReset}>
                  Empezar de nuevo
                </Button>
              </div>
            </section>
          </Box>
        ) : null}
      </Paper>
    </main>
  );
}

function QuestionRenderer({ question, answer, onChange, onMatchingChange }) {
  if (question.type === 'multiple_choice') {
    return (
      <div className="options-grid">
        {question.options.map((option) => (
          <label key={option} className="option-pill">
            <input
              type="radio"
              name={question.id}
              checked={answer === option}
              onChange={() => onChange(question.id, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'true_false') {
    return (
      <div className="options-grid two-columns">
        {['Verdadero', 'Falso'].map((option) => (
          <label key={option} className="option-pill">
            <input
              type="radio"
              name={question.id}
              checked={answer === option}
              onChange={() => onChange(question.id, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'short_text') {
    return (
      <TextField
        className="text-answer"
        value={answer ?? ''}
        placeholder="Escribe tu respuesta"
        onChange={(event) => onChange(question.id, event.target.value)}
        fullWidth
      />
    );
  }

  if (question.type === 'matching') {
    return (
      <div className="matching-list">
        {question.pairs.map((pair) => (
          <label key={pair.left} className="matching-row">
            <span>{pair.left}</span>
            <select
              value={answer?.[pair.left] ?? ''}
              onChange={(event) =>
                onMatchingChange(question.id, pair.left, event.target.value)
              }
            >
              <option value="">Elige una opción</option>
              {question.rightOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  return null;
}

export default App;
