'use client'

import { useMemo, useState } from 'react'

const CONTENT = {
  en: {
    code: 'en',
    name: 'English',
    dir: 'ltr',
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'What We Collect',
        intro: 'To provide you with the best learning experience, we collect:',
        bullets: [
          'Your email address (for account creation)',
          'Songs and vocabulary you save',
          'Usage data (to enforce fair use limits)'
        ]
      },
      {
        heading: 'Why We Limit Usage',
        intro: 'We limit song processing to 3 songs per day per user to:',
        bullets: [
          'Keep the service free and sustainable for everyone',
          'Prevent abuse and ensure fair access',
          'Manage API costs (OpenAI, YouTube, lyrics services)'
        ]
      },
      {
        heading: 'How We Protect Your Data',
        intro: 'Your privacy matters to us:',
        bullets: [
          'Your songs and vocabulary are private (only you can see them)',
          'We use industry-standard encryption',
          'We never sell your data to third parties',
          'You can delete your account and data at any time'
        ]
      },
      {
        heading: 'Technical Details',
        intro: 'Like all websites, we automatically collect certain technical information:',
        bullets: [
          'IP addresses (for security and rate limiting)',
          'Browser type and device information',
          'Usage patterns (to improve the service)'
        ],
        outro: 'This is standard practice and required for basic website operation and security.'
      },
      {
        heading: 'Third-Party Services',
        intro: 'We use the following services to provide our functionality:',
        bullets: [
          'Supabase: Database and authentication',
          'OpenAI: AI-powered vocabulary extraction',
          'YouTube API: Fetch song information',
          'Vercel: Web hosting'
        ],
        outro: 'Each service has its own privacy policy that we comply with.'
      },
      {
        heading: 'Your Rights',
        intro: 'You have the right to:',
        bullets: [
          'Access your data',
          'Request data deletion',
          'Export your vocabulary',
          'Stop using the service at any time'
        ]
      },
      {
        heading: 'Contact',
        intro: 'This is an educational project. If you have questions about your privacy, feel free to reach out through GitHub or by creating an issue in the repository.'
      }
    ],
    footer: 'Last updated: March 2026',
    back: 'Back to App'
  },
  he: {
    code: 'he',
    name: 'עברית',
    dir: 'rtl',
    title: 'מדיניות פרטיות',
    sections: [
      {
        heading: 'איזה מידע אנחנו אוספים',
        intro: 'כדי לספק חוויית לימוד טובה, אנחנו אוספים:',
        bullets: [
          'כתובת אימייל (לצורך יצירת חשבון)',
          'שירים ואוצר מילים שאתם שומרים',
          'נתוני שימוש (כדי לאכוף מגבלות שימוש הוגן)'
        ]
      },
      {
        heading: 'למה אנחנו מגבילים שימוש',
        intro: 'אנחנו מגבילים עיבוד שירים ל-3 שירים ביום לכל משתמש כדי:',
        bullets: [
          'לשמור על השירות חינמי ובר-קיימא לכולם',
          'למנוע ניצול לרעה ולהבטיח גישה הוגנת',
          'לנהל עלויות API (OpenAI, YouTube, שירותי מילים)'
        ]
      },
      {
        heading: 'איך אנחנו מגנים על המידע שלכם',
        intro: 'הפרטיות שלכם חשובה לנו:',
        bullets: [
          'השירים ואוצר המילים שלכם פרטיים (רק אתם יכולים לראות אותם)',
          'אנחנו משתמשים בהצפנה בסטנדרט תעשייתי',
          'אנחנו לא מוכרים את המידע שלכם לצד שלישי',
          'אפשר למחוק את החשבון והמידע בכל זמן'
        ]
      },
      {
        heading: 'פרטים טכניים',
        intro: 'כמו בכל אתר, נאסף אוטומטית מידע טכני מסוים:',
        bullets: [
          'כתובות IP (לאבטחה והגבלת קצב)',
          'סוג דפדפן ומידע על המכשיר',
          'דפוסי שימוש (כדי לשפר את השירות)'
        ],
        outro: 'זה נוהל מקובל ונדרש לפעילות בסיסית ואבטחה של האתר.'
      },
      {
        heading: 'שירותי צד שלישי',
        intro: 'אנחנו משתמשים בשירותים הבאים כדי לספק את המערכת:',
        bullets: [
          'Supabase: מסד נתונים ואימות משתמשים',
          'OpenAI: חילוץ אוצר מילים בעזרת AI',
          'YouTube API: שליפת מידע על שירים',
          'Vercel: אחסון והפעלת האתר'
        ],
        outro: 'לכל שירות יש מדיניות פרטיות משלו ואנחנו פועלים לפיה.'
      },
      {
        heading: 'הזכויות שלכם',
        intro: 'יש לכם זכות:',
        bullets: [
          'לצפות במידע שלכם',
          'לבקש מחיקת מידע',
          'לייצא את אוצר המילים שלכם',
          'להפסיק להשתמש בשירות בכל רגע'
        ]
      },
      {
        heading: 'יצירת קשר',
        intro: 'זה פרויקט לימודי. אם יש לכם שאלות על פרטיות, אפשר לפנות דרך GitHub או לפתוח Issue בריפוזיטורי.'
      }
    ],
    footer: 'עודכן לאחרונה: מרץ 2026',
    back: 'חזרה לאפליקציה'
  },
  pt: {
    code: 'pt',
    name: 'Português',
    dir: 'ltr',
    title: 'Política de Privacidade',
    sections: [
      {
        heading: 'O que coletamos',
        intro: 'Para oferecer a melhor experiência de aprendizado, coletamos:',
        bullets: [
          'Seu e-mail (para criação da conta)',
          'Músicas e vocabulário que você salva',
          'Dados de uso (para aplicar limites de uso justo)'
        ]
      },
      {
        heading: 'Por que limitamos o uso',
        intro: 'Limitamos o processamento para 3 músicas por dia por usuário para:',
        bullets: [
          'Manter o serviço gratuito e sustentável para todos',
          'Evitar abuso e garantir acesso justo',
          'Controlar custos de API (OpenAI, YouTube, serviços de letras)'
        ]
      },
      {
        heading: 'Como protegemos seus dados',
        intro: 'Sua privacidade é importante para nós:',
        bullets: [
          'Suas músicas e seu vocabulário são privados (somente você pode ver)',
          'Usamos criptografia em padrão de mercado',
          'Nunca vendemos seus dados para terceiros',
          'Você pode excluir sua conta e seus dados a qualquer momento'
        ]
      },
      {
        heading: 'Detalhes técnicos',
        intro: 'Como em qualquer site, coletamos automaticamente algumas informações técnicas:',
        bullets: [
          'Enderecos IP (para seguranca e limite de taxa)',
          'Tipo de navegador e informacoes do dispositivo',
          'Padroes de uso (para melhorar o servico)'
        ],
        outro: 'Essa e uma pratica padrao e necessaria para operacao e seguranca basicas do site.'
      },
      {
        heading: 'Servicos de terceiros',
        intro: 'Usamos os seguintes servicos para oferecer a funcionalidade:',
        bullets: [
          'Supabase: banco de dados e autenticacao',
          'OpenAI: extracao de vocabulario com IA',
          'YouTube API: obtencao de informacoes da musica',
          'Vercel: hospedagem web'
        ],
        outro: 'Cada servico possui sua propria politica de privacidade, e seguimos essas regras.'
      },
      {
        heading: 'Seus direitos',
        intro: 'Voce tem o direito de:',
        bullets: [
          'Acessar seus dados',
          'Solicitar exclusao de dados',
          'Exportar seu vocabulario',
          'Parar de usar o servico a qualquer momento'
        ]
      },
      {
        heading: 'Contato',
        intro: 'Este e um projeto educacional. Se voce tiver duvidas sobre privacidade, entre em contato pelo GitHub ou abra uma issue no repositorio.'
      }
    ],
    footer: 'Ultima atualizacao: marco de 2026',
    back: 'Voltar ao app'
  }
}

export default function Privacy() {
  const [language, setLanguage] = useState('en')
  const content = useMemo(() => CONTENT[language] || CONTENT.en, [language])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8" dir={content.dir}>
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-3xl font-bold text-indigo-900">{content.title}</h1>
          <div className="flex gap-2">
            {Object.values(CONTENT).map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1 rounded-md text-sm font-semibold border ${
                  language === lang.code
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 text-gray-700">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-indigo-800 mb-3">{section.heading}</h2>
              {section.intro && <p>{section.intro}</p>}
              {!!section.bullets?.length && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.outro && <p className="mt-2">{section.outro}</p>}
            </section>
          ))}

          <p className="text-sm text-gray-500 mt-8 pt-4 border-t">{content.footer}</p>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            {content.back}
          </a>
        </div>
      </div>
    </div>
  )
}
