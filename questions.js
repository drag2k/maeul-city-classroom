const defaultQuestions = [
  '첫 번째 모둠에서 본 장면',
  '두 번째 모둠에서 본 장면',
  '두 장면의 공통점',
  '도시는 어떤 곳인가요?'
];
const questionsFor = settings => settings.questions ?? defaultQuestions;
const questionVersion = settings => settings.questionVersion ?? 0;

