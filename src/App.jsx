import { useMemo, useState } from 'react';
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
import stories from './data/stories.json';

const emptyAnswers = {};

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
  return story.questions.reduce((score, question) => {
    return score + (isAnswerCorrect(question, answers[question.id]) ? 1 : 0);
  }, 0);
}

function App() {
  const [selectedStoryId, setSelectedStoryId] = useState(stories[0]?.id ?? null);
  const [answersByStory, setAnswersByStory] = useState({});
  const [submittedStories, setSubmittedStories] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ?? stories[0];
  const selectedIllustration = selectedStory.illustration;

  const currentAnswers = answersByStory[selectedStory.id] ?? emptyAnswers;
  const isSubmitted = submittedStories[selectedStory.id] ?? false;

  const score = useMemo(() => {
    if (!selectedStory) return 0;
    return getScore(selectedStory, currentAnswers);
  }, [currentAnswers, selectedStory]);

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
    setSubmittedStories((current) => ({
      ...current,
      [selectedStory.id]: true,
    }));
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

  function handleStoryChange(event) {
    setSelectedStoryId(event.target.value);
    setActiveTab(0);
  }

  if (!selectedStory) {
    return <main className="app-shell">No hay cuentos cargados todavía.</main>;
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Lectura y comprensión</p>
          <h1>Lectura Amaiur</h1>
          <p className="hero-text">
            Lee el cuento con calma y después responde las 10 preguntas.
          </p>
        </div>

        <FormControl className="story-picker" size="medium">
          <InputLabel id="story-select-label">Elegir cuento</InputLabel>
          <Select
            labelId="story-select-label"
            value={selectedStory.id}
            label="Elegir cuento"
            onChange={handleStoryChange}
          >
            {stories.map((story) => (
              <MenuItem key={story.id} value={story.id}>
                {story.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </section>

      <Paper className="tabs-shell" elevation={0}>
        <Box className="tabs-header">
          <Typography className="story-tag">{selectedStory.category}</Typography>
          <Typography variant="h4" className="tab-title">
            {selectedStory.title}
          </Typography>
          <Typography className="story-summary">{selectedStory.summary}</Typography>
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
                ) : null}
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
                  Corregir
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
