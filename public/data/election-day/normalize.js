const alias = [
  { alias: 'ГЕРБ', versions: ['ПП "ГЕРБ"', 'ПП ГЕРБ', 'ГЕРБ-СДС', 'ГЕРБ'] },
  { alias: 'ИТН', versions: ['ПП ИМА ТАКЪВ НАРОД'] },
  {
    alias: 'ДПС',
    versions: [
      'ДПС - Движение за права и свободи',
      'ДПС "Движение за права и свободи"',
      'ДПС "ДВИЖЕНИЕ ЗА ПРАВА И СВОБОДИ"',
      'Движение за права и свободи - ДПС',
      'Движение за права и свободи – ДПС',
      'ПП "Движение за Права и Свободи"',
    ],
  },
  { alias: 'АТАКА', versions: ['Партия АТАКА', 'ПП "Атака"', 'АТАКА', 'КОАЛИЦИЯ \"АТАКА\"'] },
  { alias: 'ДЕМОКРАТИЧНА БЪЛГАРИЯ', versions: ['ДЕМОКРАТИЧНА БЪЛГАРИЯ – ОБЕДИНЕНИЕ (ДА България, ДСБ, Зелено движение)'] },
  { alias: 'Продължаваме Промяната', versions: ['Продължаваме Промяната'] },
  { alias: 'ВЪЗРАЖДАНЕ', versions: ['ВЪЗРАЖДАНЕ'] },
  {
    alias: 'БСП',
    versions: [
      'БСП ЗА БЪЛГАРИЯ',
      'БСП – ОБЕДИНЕНА ЛЕВИЦА',
      'БСП лява България',
      'БСП за БЪЛГАРИЯ',
      'КОАЛИЦИЯ ЗА БЪЛГАРИЯ',
      'КП "Коалиция за България"',
      '"КОАЛИЦИЯ ЗА БЪЛГАРИЯ - БСП, ПБС, ПД - СОЦИАЛДЕМОКРАТИ, ДСХ, П. "РОМА", КПБ, БЗНС - АЛ. СТАМБОЛИЙСКИ, ЗПБ"',
    ],
  },
  { alias: 'АПС', versions: ['АЛИАНС ЗА ПРАВА И СВОБОДИ – АПС'] },
  { alias: 'ДПС-Ново начало', versions: ['ДПС-Ново начало'] },
  { alias: 'БЪЛГАРСКИ ВЪЗХОД', versions: ['ПП БЪЛГАРСКИ ВЪЗХОД', 'БЪЛГАРСКИ ВЪЗХОД'] },
  { alias: 'ПРОДЪЛЖАВАМЕ ПРОМЯНАТА – ДЕМОКРАТИЧНА БЪЛГАРИЯ', versions: ['КОАЛИЦИЯ ПРОДЪЛЖАВАМЕ ПРОМЯНАТА – ДЕМОКРАТИЧНА БЪЛГАРИЯ'] },
  { alias: 'ВЕЛИЧИЕ', versions: ['ПП ВЕЛИЧИЕ'] },
  { alias: 'ПП МЕЧ', versions: ['ПП МЕЧ'] },
  { alias: 'ИЗПРАВИ СЕ! МУТРИ ВЪН!', versions: ['ИЗПРАВИ СЕ! МУТРИ ВЪН!'] },
  { alias: 'ВОЛЯ', versions: ['ВОЛЯ'] },
  { alias: 'ЛИДЕР', versions: ['ПП "ЛИДЕР"'] },
  { alias: 'РЗС', versions: ['"Ред, законност и справедливост"'] },
  { alias: 'Синята коалиция', versions: ['"Синята коалиция"'] },
  { alias: 'РЕФОРМАТОРСКИ БЛОК', versions: ['РЕФОРМАТОРСКИ БЛОК - БЗНС, ДБГ, ДСБ, НПСД, СДС', 'РЕФОРМАТОРСКИ БЛОК – ГЛАС НАРОДЕН'] },
  { alias: 'ВМРО', versions: ['ПП ВМРО – БЪЛГАРСКО НАЦИОНАЛНО ДВИЖЕНИЕ'] },
  {
    alias: 'ОБЕДИНЕНИ ПАТРИОТИ',
    versions: ['ОБЕДИНЕНИ ПАТРИОТИ – НФСБ, АТАКА и ВМРО', 'ПАТРИОТИЧЕН ФРОНТ - НФСБ И ВМРО', 'БЪЛГАРСКИТЕ ПАТРИОТИ – ВМРО, ВОЛЯ И НФСБ'],
  },
  { alias: 'АБВ', versions: ['Коалиция АБВ - (Алтернатива за българско възраждане)'] },
  { alias: 'БЪЛГАРИЯ БЕЗ ЦЕНЗУРА', versions: ['КП БЪЛГАРИЯ БЕЗ ЦЕНЗУРА'] },
  { alias: 'България на Гражданите', versions: ['ПП "Движение България на Гражданите"'] },
  { alias: 'НФСБ', versions: ['ПП "Национален Фронт за Спасение на България"'] },
  { alias: 'НДСВ', versions: ['НАЦИОНАЛНО ДВИЖЕНИЕ СИМЕОН ВТОРИ (НДСВ)', 'НДСВ'] },
];

// Elections from 2009-07-05, 2013-05-12 and 2014-10-05 have only data for the total number of valid votes.
function calcBarrier(validVotes, validVotesForCandidates) {
  let barrierBase = null;

  if (!validVotesForCandidates && validVotes) {
    barrierBase = validVotes;
  } else if (validVotesForCandidates) {
    barrierBase = validVotesForCandidates;
  } else {
    return null;
  }

  // return parseInt(barrierBase * 0.04);
  return parseFloat((barrierBase * 0.04).toFixed(0));
}

function getAliasByVersion(version) {
  for (const item of alias) {
    if (item.versions.includes(version)) {
      return item.alias;
    }
  }
  return version;
}

function sumVotesAndPercent(data, a, b) {
  const candidateA = data.find((candidate) => candidate.alias === a);
  const candidateB = data.find((candidate) => candidate.alias === b);

  if (candidateA && candidateB) {
    const totalVotes = candidateA.votes + candidateB.votes;
    const totalPercent = parseFloat((candidateA.percent + candidateB.percent).toFixed(2));

    return {
      name: `${a} + ${b}`,
      votes: totalVotes,
      percent: totalPercent,
      alias: `${a} + ${b}`,
    };
  }

  return null;
}

const fs = require('fs');
let diff = {};

const dataJson = JSON.parse(fs.readFileSync('public/data/election-day/parliament_raw.json', 'utf8'));
const result = [];

let metaCount = 1;
dataJson.forEach((election) => {
  if (election.assembly >= 45) {
    election.metaCount = metaCount;
    metaCount = metaCount + 1;
  }
  if (!election.metrics) {
    result.push(election);
    return;
  }

  // Remove metrics.activity — use top-level activity instead
  delete election.metrics.activity;

  // Calculate activity diff from top-level activity
  if (election.activity != null) {
    election.activityDiff = parseFloat((election.activity - (diff['activity'] ?? 0)).toFixed(2));
    diff['activity'] = election.activity;
  }

  // Add info for total number of valid votes for the elections that don't have that info (example 2024-06-09, 2024-10-27).
  if (election.metrics.validTotal === undefined) {
    election.metrics.validTotal = {
      value: (election.metrics.validForParties?.value ?? 0) + (election.metrics.validNone?.value ?? 0),
      meta_source: 'calculated',
      meta_destination: 'validForParties + validNone',
    };
  }

  election.metrics.barrier = {
    value: calcBarrier(election.metrics.validTotal?.value, election.metrics.validForParties?.value),
    meta_source: 'calculated',
  };

  for (const key in election.metrics) {
    if (key === 'parties') {
      election.metrics.parties.push({
        name: 'ДПС (АПС + ДПС-Ново начало)',
        alias: 'ДПС (АПС + ДПС-Ново начало)',
        votes: 0,
        percent: 0,
        mandates: 0,
        diff: 0,
      });

      election.metrics.parties.forEach((party) => {
        party.alias = getAliasByVersion(party.name);
        party.mandates = party.mandates ?? 0;
        party.votesDiff = party.votes - (diff[party.alias] ?? 0);
        party.votesDiffPercent = parseFloat(((party.votesDiff / party.votes) * 100).toFixed(2));
        diff[party.alias] = party.votes;
        party.mandatesDiff = party.mandates - (diff[party.alias + '-mandates'] ?? 0);
        diff[party.alias + '-mandates'] = party.mandates;
      });
    } else {
      election.metrics[key].diff = election.metrics[key].value - (diff[key] ?? 0);
      diff[key] = election.metrics[key].value;
    }
  }

  let sumVotes = 0;
  let sumPercent = 0;
  let sumMandates = 0;

  election.metrics.parties.forEach((party) => {
    if (party.alias === 'ДПС-Ново начало' || party.alias === 'АПС' || party.alias === 'ДПС') {
      sumVotes += party.votes;
      sumPercent += party.percent;
      sumMandates += party.mandates;
    }
  });

  election.metrics.parties.forEach((party) => {
    if (party.alias === 'ДПС (АПС + ДПС-Ново начало)') {
      party.votes = sumVotes;
      party.percent = sumPercent;
      party.mandates = sumMandates;

      party.votesDiff = party.votes - (diff[party.alias + '-total'] ?? 0);
      party.votesDiffPercent = parseFloat(((party.votesDiff / party.votes) * 100).toFixed(2));
      diff[party.alias + '-total'] = party.votes;
      party.mandatesDiff = party.mandates - (diff[party.alias + '-total-mandates'] ?? 0);
      diff[party.alias + '-total-mandates'] = party.mandates;
    }
  });

  result.push(election);
});

fs.writeFileSync('public/data/parliament_normalized.json', JSON.stringify(result, null, 4) + '\n');
console.log('File written successfully!');
