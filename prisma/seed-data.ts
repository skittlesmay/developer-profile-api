import type {
  ExperienceModel,
  ProfessionalLinkModel,
  ProfileModel,
  ProjectModel,
  SkillModel,
} from '../src/generated/prisma/models';

export type SeedData = {
  profile: ProfileModel;
  links: ProfessionalLinkModel[];
  skills: SkillModel[];
  experience: ExperienceModel[];
  projects: ProjectModel[];
};

const profile: ProfileModel = {
  id: 'platon-savushkin',
  name: 'Платон Савушкин',
  description:
    'Fullstack-разработчик с фокусом на backend: TypeScript, NestJS, PostgreSQL, Prisma, API и интеграции. Коммерческая разработка веб-сервисов и e-commerce проектов.',
};

export const seedData: SeedData = {
  profile,
  links: [
    {
      id: 'platon-savushkin-link-github',
      profileId: profile.id,
      label: 'GitHub',
      url: 'https://github.com/skittlesmay',
      sortOrder: 0,
    },
    {
      id: 'platon-savushkin-link-telegram',
      profileId: profile.id,
      label: 'Telegram',
      url: 'https://t.me/platonsavushkin',
      sortOrder: 1,
    },
  ],
  skills: [
    ['typescript', 'TypeScript', 'Backend'],
    ['nodejs', 'Node.js', 'Backend'],
    ['nestjs', 'NestJS', 'Backend'],
    ['graphql', 'GraphQL', 'Backend'],
    ['rest-api', 'REST API', 'Backend'],
    ['express', 'Express', 'Backend'],
    ['postgresql', 'PostgreSQL', 'Database'],
    ['prisma', 'Prisma ORM', 'Database'],
    ['redis', 'Redis', 'Database'],
    ['docker', 'Docker', 'Infrastructure'],
    ['docker-compose', 'Docker Compose', 'Infrastructure'],
    ['s3', 'S3', 'Infrastructure'],
    ['minio', 'MinIO', 'Infrastructure'],
    ['bullmq', 'BullMQ', 'Messaging'],
    ['rabbitmq', 'RabbitMQ', 'Messaging'],
    ['websocket', 'WebSocket', 'Messaging'],
    ['socketio', 'Socket.IO', 'Messaging'],
    ['react', 'React', 'Frontend'],
    ['nextjs', 'Next.js', 'Frontend'],
    ['python', 'Python', 'Other'],
  ].map(([id, name, category], sortOrder) => ({
    id: `${profile.id}-skill-${id}`,
    profileId: profile.id,
    name,
    category,
    sortOrder,
  })),
  experience: [
    {
      id: 'platon-savushkin-experience-ecommerce',
      profileId: profile.id,
      company: 'E-commerce & Digital Solutions',
      position: 'Fullstack Developer',
      startMonth: '2023-09',
      endMonth: null,
      achievements: [
        'Разработка API и серверной логики для 3 коммерческих веб-проектов',
        'Сценарии каталога, карточек товаров, корзины и заявок, включая валидацию и обработку ошибок',
        'PostgreSQL, Docker Compose и health checks для приложений',
      ],
      sortOrder: 0,
    },
    {
      id: 'platon-savushkin-experience-projects',
      profileId: profile.id,
      company: 'Проектная разработка',
      position: 'Fullstack Developer (part-time)',
      startMonth: '2025-06',
      endMonth: '2026-10',
      achievements: [
        'SAFEQ: фоновые проверки через очередь и обновление статусов через Socket.IO',
        'OSINT: API поиска, отчеты, очереди заданий, PostgreSQL и Neo4j',
        'VPN Bot Gateway: связка Telegram-бота, оплаты и управления подписками',
        'LuLu: серверная логика бронирования, интеграции платежей, CRM и email',
      ],
      sortOrder: 1,
    },
    {
      id: 'platon-savushkin-experience-kmept',
      profileId: profile.id,
      company: 'КМЭПТ (проектная разработка)',
      position: 'Fullstack Developer',
      startMonth: '2025-09',
      endMonth: '2026-05',
      achievements: [
        'Импорт Excel и публикация расписания для групп и преподавателей',
        'Версии расписания и защита чтения и обновления от race condition',
        'Автоматизация публикации расписания на 90% по данным CV',
      ],
      sortOrder: 2,
    },
  ],
  projects: [
    {
      id: 'safeq',
      name: 'SAFEQ',
      description:
        'Сервис мониторинга игровых сессий, фоновые проверки через очередь и обновление статусов через Socket.IO',
      url: 'https://github.com/skittlesmay/safeq-architecture',
    },
    {
      id: 'osint',
      name: 'OSINT',
      description:
        'Поиск открытых данных, API отчетов, очередь заданий и граф связей',
      url: 'https://github.com/skittlesmay/OSINT',
    },
    {
      id: 'vpn-bot',
      name: 'VPN Bot Gateway',
      description:
        'Интеграция Telegram-бота, платежного API и Marzban для управления подписками',
      url: 'https://github.com/skittlesmay/marzban-vpn-bot-gateway',
    },
    {
      id: 'lulu',
      name: 'LuLu',
      description:
        'Серверная логика бронирования экскурсий, оплата, передача сделок в CRM и подтверждения по email',
      url: 'https://github.com/skittlesmay/LuluHackathon',
    },
    {
      id: 'kmept',
      name: 'Расписание КМЭПТ',
      description:
        'Участие в разработке импорта Excel, версионирования и автоматизации публикации расписания',
      url: 'https://github.com/skittlesmay/rp.kmept',
    },
    {
      id: 'gleb',
      name: 'gleb.solutions',
      description:
        'Участие в разработке коммерческого сайта и интерфейса в стиле операционной системы',
      url: 'https://gleb.solutions/',
    },
    {
      id: 'nuw',
      name: 'NUW.STORE',
      description:
        'Доработка товарных страниц и пользовательских e-commerce сценариев',
      url: 'https://nuw.store/',
    },
    {
      id: 'marcelo',
      name: 'Marcelo Miracles',
      description:
        'Доработка товарных страниц и адаптация пользовательских сценариев под мобильные устройства',
      url: 'https://ru.marcelomiracles.com/',
    },
  ].map((project, sortOrder) => ({
    ...project,
    profileId: profile.id,
    sortOrder,
  })),
};
