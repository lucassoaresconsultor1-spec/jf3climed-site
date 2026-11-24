// Menu mobile e ano do rodapé
const toggle = document.querySelector('.menu-toggle');
const menu = document.getElementById('menu');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

document.querySelectorAll('.year').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Formulário de agendamento: monta a mensagem e abre o WhatsApp da clínica
const formAgendar = document.getElementById('form-agendar');
if (formAgendar) {
  formAgendar.addEventListener('submit', (event) => {
    event.preventDefault();
    const dados = Object.fromEntries(new FormData(formAgendar));
    const erro = document.getElementById('f-erro');
    if (!dados.nome.trim() || !dados.telefone.trim()) {
      erro.hidden = false;
      return;
    }
    erro.hidden = true;
    const dataBR = dados.data ? dados.data.split('-').reverse().join('/') : 'a combinar';
    const texto = [
      'Olá! Gostaria de solicitar uma consulta na JF3 Clínica Médica.',
      `Nome: ${dados.nome.trim()}`,
      `Telefone: ${dados.telefone.trim()}`,
      `Especialidade: ${dados.servico}`,
      `Período: ${dados.periodo}`,
      `Data preferida: ${dataBR}`,
      dados.mensagem.trim() ? `Mensagem: ${dados.mensagem.trim()}` : '',
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/5521971100929?text=${encodeURIComponent(texto)}`;
    // Alguns navegadores bloqueiam a nova aba; nesse caso abre na mesma
    const aba = window.open(url, '_blank');
    if (aba) aba.opener = null;
    else location.href = url;
  });
}

// Revelar grupos ao rolar. Sem JS, o conteúdo fica visível.
document.documentElement.classList.add('js');
const revealTargets = document.querySelectorAll(
  '.section-head, .cards, .grid-4, .dark-cards, .team-grid, .tips, .contact-grid, .quotes, .rating-bar, .faq, .map-band, .split, .band, .checks'
);
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -8% 0px' }); // threshold 0: grupos mais altos que a tela também aparecem
// Grades entram em cascata (um card depois do outro); o resto entra em bloco
const GRADES = '.cards, .grid-4, .dark-cards, .team-grid, .tips, .contact-grid, .quotes, .faq, .checks';
revealTargets.forEach((el) => {
  if (el.matches(GRADES)) {
    el.classList.add('stagger');
    [...el.children].forEach((child, i) => { child.style.transitionDelay = `${Math.min(i, 6) * 90}ms`; });
  } else {
    el.classList.add('reveal');
  }
  observer.observe(el);
});
// Depois da entrada, tira o atraso para o hover dos cards responder na hora
document.addEventListener('transitionend', (e) => {
  if (e.propertyName === 'opacity' && e.target.parentElement?.classList.contains('stagger')) {
    e.target.style.transitionDelay = '';
  }
});
