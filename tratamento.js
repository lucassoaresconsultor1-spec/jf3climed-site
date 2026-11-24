// Conteúdo de cada tratamento. A página tratamento.html mostra o tratamento do #slug da URL.
const TRATAMENTOS = [
  {
    slug: 'clinica',
    nome: 'Clínica médica',
    img: 'assets/trat-clinica.jpg',
    resumo: 'Consultas para diagnóstico, acompanhamento de doenças crônicas, check-ups, consulta popular e prevenção.',
    desc: 'Consultas de rotina, check-ups, prevenção e acompanhamento contínuo, com orientação clara para cada etapa do seu cuidado.',
    intro: 'Seu primeiro passo para uma saúde melhor. Oferecemos consultas de rotina, exames preventivos, acompanhamento de doenças crônicas e consulta popular para as suas necessidades do dia a dia.',
    visao: 'Avaliação clínica completa, com escuta atenta das suas queixas, histórico e hábitos, para orientar o cuidado mais adequado.',
    esperar: 'Uma conversa sobre suas preocupações, exame físico quando indicado e recomendações com base nas suas circunstâncias.',
    paraquem: 'Adultos que buscam check-up, prevenção, acompanhamento de condições crônicas ou avaliação de sintomas do dia a dia.',
  },
  {
    slug: 'biomedicina',
    nome: 'Biomedicina estética',
    img: 'assets/trat-biomedicina.jpg',
    resumo: 'Tratamentos estéticos personalizados, elaborados de acordo com seus objetivos, conforto e necessidades.',
    desc: 'Tratamentos estéticos personalizados, pensados de acordo com seus objetivos, conforto e necessidades individuais.',
    intro: 'Cuidar da aparência também é cuidar de si. Oferecemos tratamentos estéticos personalizados, com avaliação prévia e acompanhamento em cada etapa.',
    visao: 'Procedimentos estéticos realizados por profissional da área, com foco em segurança, naturalidade e bem-estar.',
    esperar: 'Uma avaliação inicial para entender seus objetivos, explicação das opções disponíveis e um plano de tratamento sob medida.',
    paraquem: 'Quem deseja cuidar da pele e da autoestima com orientação profissional. A indicação depende da avaliação individual.',
  },
  {
    slug: 'fisioterapia',
    nome: 'Fisioterapia',
    img: 'assets/trat-fisio.jpg',
    resumo: 'Reabilitação de lesões, dores musculares e articulares, pós-operatório e melhora da mobilidade.',
    desc: 'Reabilitação de lesões, alívio de dores e recuperação da mobilidade, com plano de tratamento adaptado a cada paciente.',
    intro: 'Recupere movimento e qualidade de vida. A fisioterapia atua na reabilitação de lesões, dores musculares e articulares, pós-operatório e melhora da mobilidade.',
    visao: 'Avaliação funcional e exercícios terapêuticos direcionados, com acompanhamento da sua evolução a cada sessão.',
    esperar: 'Uma avaliação dos seus movimentos e dores, definição de metas e um plano de sessões adaptado à sua rotina.',
    paraquem: 'Pessoas com dores, lesões, limitações de movimento ou em recuperação de cirurgias, conforme avaliação profissional.',
  },
  {
    slug: 'nutricao',
    nome: 'Nutrição',
    img: 'assets/trat-nutricao.jpg',
    resumo: 'Planejamento alimentar individualizado para saúde, bem-estar, controle de peso e performance.',
    desc: 'Planejamento alimentar individualizado para saúde, bem-estar, controle de peso e performance.',
    intro: 'Alimentação que cabe na sua rotina. Planejamento alimentar individualizado para saúde, bem-estar, controle de peso e performance, respeitando suas preferências.',
    visao: 'Orientação nutricional baseada nos seus hábitos, objetivos e condições de saúde, com metas realistas.',
    esperar: 'Uma conversa sobre sua rotina e alimentação, avaliação das suas necessidades e um plano alimentar personalizado.',
    paraquem: 'Quem busca emagrecimento, ganho de massa, reeducação alimentar ou acompanhamento nutricional de condições de saúde.',
  },
  {
    slug: 'saude-mental',
    nome: 'Saúde mental',
    img: 'assets/trat-saude-mental.jpg',
    resumo: 'Cuidados na área da saúde mental, com acolhimento e orientação individualizada.',
    desc: 'Cuidados na área da saúde mental, com acolhimento, escuta atenta e orientação individualizada.',
    intro: 'Cuidar da mente também é cuidar da saúde. Oferecemos atendimento na área da saúde mental com acolhimento, escuta atenta e orientação individualizada.',
    visao: 'Um espaço seguro e respeitoso para falar sobre emoções, dificuldades e objetivos, com acompanhamento profissional.',
    esperar: 'Um primeiro encontro para entender suas necessidades e definir, junto com você, o melhor caminho de cuidado.',
    paraquem: 'Pessoas que enfrentam ansiedade, estresse, mudanças de vida ou que desejam cuidar do bem-estar emocional.',
  },
  {
    slug: 'pediatria',
    nome: 'Pediatria',
    img: 'assets/trat-pediatria.jpg',
    resumo: 'Atendimento médico delicado e atencioso para crianças, com foco no desenvolvimento saudável.',
    desc: 'Atendimento médico delicado e atencioso para crianças, com foco no desenvolvimento saudável e orientação para as famílias.',
    intro: 'Cuidado atento desde os primeiros anos. Acompanhamos o crescimento e o desenvolvimento das crianças, com orientação clara para as famílias.',
    visao: 'Consultas de rotina, acompanhamento do crescimento e avaliação de queixas comuns da infância.',
    esperar: 'Um atendimento acolhedor para a criança e a família, com exame cuidadoso e orientações práticas.',
    paraquem: 'Bebês, crianças e adolescentes, em consultas de rotina ou quando surgir alguma queixa.',
  },
];

console.assert(
  TRATAMENTOS.every((t) => ['slug', 'nome', 'img', 'resumo', 'desc', 'intro', 'visao', 'esperar', 'paraquem'].every((k) => t[k])),
  'tratamento.js: algum tratamento está sem campo obrigatório'
);

function renderTratamento() {
  const slug = location.hash.slice(1);
  const index = Math.max(0, TRATAMENTOS.findIndex((t) => t.slug === slug)); // slug desconhecido: mostra o primeiro
  const t = TRATAMENTOS[index];

  document.title = `${t.nome} | JF3 Clínica Médica`;
  const img = document.getElementById('t-img');
  img.src = t.img;
  img.alt = '';
  for (const campo of ['nome', 'desc', 'intro', 'visao', 'esperar', 'paraquem']) {
    document.getElementById(`t-${campo}`).textContent = t[campo];
  }

  // Três próximos tratamentos, em sequência circular
  const outros = [1, 2, 3].map((n) => TRATAMENTOS[(index + n) % TRATAMENTOS.length]);
  document.getElementById('t-outros').innerHTML = outros.map((o) => `
    <article class="tcard">
      <div class="media"><img src="${o.img}" alt=""></div>
      <h3>${o.nome}</h3>
      <p>${o.resumo}</p>
      <a href="tratamento.html#${o.slug}" class="more">Saiba mais</a>
    </article>`).join('');
}

renderTratamento();
window.addEventListener('hashchange', () => {
  renderTratamento();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
