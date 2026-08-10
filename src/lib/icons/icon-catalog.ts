import React from 'react';
import { Icon } from '@iconify/react';
import * as SiIcons from 'react-icons/si';
import * as GrIcons from 'react-icons/gr';
import * as TbIcons from 'react-icons/tb';

export interface IconCatalogEntry {
  kind: string;
  name: string;
  source: 'simpleicons' | 'grommet' | 'tabler' | 'iconify';
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const dynamicCatalogMap = new Map<string, IconCatalogEntry>();

/**
 * Creates an Iconify online/package component wrapper using React.createElement for pure .ts file compatibility.
 */
function createIconifyComponent(iconId: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return function IconifyWrapper(props: { className?: string; style?: React.CSSProperties }) {
    return React.createElement(Icon, {
      icon: iconId,
      width: '100%',
      height: '100%',
      className: props.className || 'h-full w-full',
      style: { width: '100%', height: '100%', ...props.style },
    });
  };
}

// System Design & Cloud Architecture Iconify Collection (Eraser.io style ready-made icons)
const SYSTEM_DESIGN_ICONIFY_LIST: { kind: string; name: string; iconId: string }[] = [
  // AWS Cloud Infrastructure
  { kind: 'iconify-aws-ec2', name: 'EC2 (AWS Compute)', iconId: 'logos:aws-ec2' },
  { kind: 'iconify-aws-elb', name: 'Load Balancer (AWS ELB/ALB)', iconId: 'logos:aws-elb' },
  { kind: 'iconify-aws-s3', name: 'S3 (AWS Object Storage)', iconId: 'logos:aws-s3' },
  { kind: 'iconify-aws-rds', name: 'RDS (AWS Relational DB)', iconId: 'logos:aws-rds' },
  { kind: 'iconify-aws-lambda', name: 'Lambda (AWS Serverless)', iconId: 'logos:aws-lambda' },
  { kind: 'iconify-aws-sqs', name: 'SQS (AWS Message Queue)', iconId: 'logos:aws-sqs' },
  { kind: 'iconify-aws-sns', name: 'SNS (AWS Push Notification)', iconId: 'logos:aws-sns' },
  { kind: 'iconify-aws-dynamodb', name: 'DynamoDB (AWS NoSQL)', iconId: 'logos:aws-dynamodb' },
  { kind: 'iconify-aws-cloudfront', name: 'CloudFront (AWS CDN)', iconId: 'logos:aws-cloudfront' },
  { kind: 'iconify-aws-route53', name: 'Route 53 (AWS DNS)', iconId: 'logos:aws-route53' },
  { kind: 'iconify-aws-api-gateway', name: 'API Gateway (AWS)', iconId: 'logos:aws-api-gateway' },
  { kind: 'iconify-aws-ecs', name: 'ECS (AWS Container)', iconId: 'logos:aws-ecs' },
  { kind: 'iconify-aws-eks', name: 'EKS (AWS Kubernetes)', iconId: 'logos:aws-eks' },
  { kind: 'iconify-aws-elasticache', name: 'ElastiCache (AWS Cache)', iconId: 'logos:aws-elasticache' },
  { kind: 'iconify-aws-iam', name: 'IAM (AWS Security)', iconId: 'logos:aws-iam' },
  { kind: 'iconify-aws-vpc', name: 'VPC (AWS Network)', iconId: 'logos:aws-vpc' },
  { kind: 'iconify-aws-kinesis', name: 'Kinesis (AWS Streaming)', iconId: 'logos:aws-kinesis' },

  // GCP Google Cloud
  { kind: 'iconify-gcp', name: 'Google Cloud Platform', iconId: 'logos:google-cloud' },
  { kind: 'iconify-gcp-run', name: 'Cloud Run (GCP Containers)', iconId: 'logos:google-cloud-run' },
  { kind: 'iconify-gcp-functions', name: 'Cloud Functions (GCP)', iconId: 'logos:google-cloud-functions' },
  { kind: 'iconify-gcp-pubsub', name: 'Cloud Pub/Sub (GCP)', iconId: 'logos:google-cloud-pubsub' },
  { kind: 'iconify-gcp-bigquery', name: 'BigQuery (GCP Warehouse)', iconId: 'logos:google-bigquery' },
  { kind: 'iconify-firebase', name: 'Firebase Backend', iconId: 'logos:firebase' },

  // Azure Cloud
  { kind: 'iconify-azure', name: 'Microsoft Azure Cloud', iconId: 'logos:azure-icon' },
  { kind: 'iconify-azure-devops', name: 'Azure DevOps Services', iconId: 'logos:azure-devops' },

  // Databases & Caches
  { kind: 'iconify-redis', name: 'Redis In-Memory Store', iconId: 'logos:redis' },
  { kind: 'iconify-postgresql', name: 'PostgreSQL Database', iconId: 'logos:postgresql' },
  { kind: 'iconify-mysql', name: 'MySQL Relational DB', iconId: 'logos:mysql' },
  { kind: 'iconify-mongodb', name: 'MongoDB Document DB', iconId: 'logos:mongodb-icon' },
  { kind: 'iconify-elasticsearch', name: 'Elasticsearch Engine', iconId: 'logos:elasticsearch' },
  { kind: 'iconify-cassandra', name: 'Apache Cassandra', iconId: 'logos:cassandra' },
  { kind: 'iconify-sqlite', name: 'SQLite Database', iconId: 'logos:sqlite' },
  { kind: 'iconify-supabase', name: 'Supabase Open Source DB', iconId: 'logos:supabase-icon' },
  { kind: 'iconify-snowflake', name: 'Snowflake Data Cloud', iconId: 'logos:snowflake-icon' },
  { kind: 'iconify-neo4j', name: 'Neo4j Graph Database', iconId: 'logos:neo4j' },

  // DevOps & Microservices
  { kind: 'iconify-docker', name: 'Docker Container Engine', iconId: 'logos:docker-icon' },
  { kind: 'iconify-kubernetes', name: 'Kubernetes Container Cluster', iconId: 'logos:kubernetes' },
  { kind: 'iconify-nginx', name: 'Nginx Web Server Proxy', iconId: 'logos:nginx' },
  { kind: 'iconify-terraform', name: 'HashiCorp Terraform IaC', iconId: 'logos:terraform' },
  { kind: 'iconify-ansible', name: 'Ansible Automation', iconId: 'logos:ansible' },
  { kind: 'iconify-helm', name: 'Helm Package Manager', iconId: 'logos:helm' },
  { kind: 'iconify-jenkins', name: 'Jenkins CI/CD Pipeline', iconId: 'logos:jenkins' },
  { kind: 'iconify-github', name: 'GitHub Code & Actions', iconId: 'logos:github-icon' },
  { kind: 'iconify-gitlab', name: 'GitLab DevOps Platform', iconId: 'logos:gitlab' },
  { kind: 'iconify-cloudflare', name: 'Cloudflare Edge & CDN', iconId: 'logos:cloudflare' },
  { kind: 'iconify-vercel', name: 'Vercel Serverless Platform', iconId: 'logos:vercel-icon' },
  { kind: 'iconify-netlify', name: 'Netlify Web Hosting', iconId: 'logos:netlify-icon' },
  { kind: 'iconify-digitalocean', name: 'DigitalOcean Cloud', iconId: 'logos:digitalocean-icon' },

  // Streaming & Messaging
  { kind: 'iconify-rabbitmq', name: 'RabbitMQ Message Broker', iconId: 'logos:rabbitmq-icon' },
  { kind: 'iconify-kafka', name: 'Apache Kafka Event Stream', iconId: 'logos:apache-kafka' },
  { kind: 'iconify-graphql', name: 'GraphQL API Engine', iconId: 'logos:graphql' },
  { kind: 'iconify-grpc', name: 'gRPC Microservice API', iconId: 'logos:grpc' },
  { kind: 'iconify-swagger', name: 'Swagger OpenAPI Specs', iconId: 'logos:swagger' },
  { kind: 'iconify-socketio', name: 'Socket.io WebSockets', iconId: 'logos:socket-io' },

  // Monitoring, Analytics & Security
  { kind: 'iconify-prometheus', name: 'Prometheus Metrics', iconId: 'logos:prometheus' },
  { kind: 'iconify-grafana', name: 'Grafana Dashboards', iconId: 'logos:grafana' },
  { kind: 'iconify-datadog', name: 'Datadog APM & Logs', iconId: 'logos:datadog' },
  { kind: 'iconify-sentry', name: 'Sentry Error Monitoring', iconId: 'logos:sentry-icon' },
  { kind: 'iconify-auth0', name: 'Auth0 Identity Provider', iconId: 'logos:auth0-icon' },
  { kind: 'iconify-okta', name: 'Okta Enterprise Auth', iconId: 'logos:okta-icon' },
  { kind: 'iconify-vault', name: 'HashiCorp Vault Secrets', iconId: 'logos:vault-icon' },

  // Tech Stacks & Languages
  { kind: 'iconify-nodejs', name: 'Node.js JavaScript Runtime', iconId: 'logos:nodejs-icon' },
  { kind: 'iconify-python', name: 'Python Programming', iconId: 'logos:python' },
  { kind: 'iconify-go', name: 'Go / Golang Language', iconId: 'logos:go' },
  { kind: 'iconify-rust', name: 'Rust High-Perf Systems', iconId: 'logos:rust' },
  { kind: 'iconify-java', name: 'Java Platform Engine', iconId: 'logos:java' },
  { kind: 'iconify-react', name: 'React UI Library', iconId: 'logos:react' },
  { kind: 'iconify-nextjs', name: 'Next.js React Framework', iconId: 'logos:nextjs-icon' },
  { kind: 'iconify-typescript', name: 'TypeScript Type System', iconId: 'logos:typescript-icon' },

  // Generic Architecture Ready-Made Vector Symbols
  { kind: 'iconify-sys-server', name: 'Server Host Node', iconId: 'tabler:server' },
  { kind: 'iconify-sys-database', name: 'Database Cluster', iconId: 'tabler:database' },
  { kind: 'iconify-sys-cloud', name: 'Cloud Infrastructure', iconId: 'tabler:cloud' },
  { kind: 'iconify-sys-cpu', name: 'Compute Core CPU', iconId: 'tabler:cpu' },
  { kind: 'iconify-sys-router', name: 'Network Gateway Router', iconId: 'tabler:router' },
  { kind: 'iconify-sys-shield', name: 'Firewall & Shield', iconId: 'tabler:shield-lock' },
  { kind: 'iconify-sys-box', name: 'Microservice Box', iconId: 'tabler:box-seam' },
  { kind: 'iconify-sys-lock', name: 'Security Vault Lock', iconId: 'tabler:lock' },
  { kind: 'iconify-sys-world', name: 'Public Internet Web', iconId: 'tabler:world-www' },
  { kind: 'iconify-sys-devices', name: 'Client Endpoints Devices', iconId: 'tabler:devices' },
];

SYSTEM_DESIGN_ICONIFY_LIST.forEach((item) => {
  dynamicCatalogMap.set(item.kind, {
    kind: item.kind,
    name: item.name,
    source: 'iconify',
    icon: createIconifyComponent(item.iconId),
  });
});

function isValidIconComponent(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === 'function') return true;
  if (typeof val === 'object' && val !== null) {
    const iconLike = val as { render?: unknown; $$typeof?: unknown };
    if (typeof iconLike.render === 'function') return true;
    if (iconLike.$$typeof && typeof iconLike.$$typeof === 'symbol') return true;
  }
  return false;
}

/**
 * Filter icons specifically for System Design & Cloud Architecture.
 * Excludes generic UI/social media icons.
 */
function isSystemDesignIcon(cleanName: string): boolean {
  const lower = cleanName.toLowerCase();
  
  // List of system design keywords & tech stacks
  const systemKeywords = [
    'amazon', 'aws', 'ec2', 's3', 'rds', 'sqs', 'sns', 'lambda', 'dynamo', 'cloud', 'elastic',
    'redis', 'rabbit', 'kafka', 'docker', 'kube', 'k8s', 'nginx', 'apache', 'postgres', 'mongo',
    'mysql', 'maria', 'sql', 'db', 'database', 'server', 'storage', 'node', 'cluster', 'network',
    'router', 'gateway', 'proxy', 'cache', 'queue', 'firewall', 'shield', 'security', 'vault',
    'graphql', 'grpc', 'api', 'prometheus', 'grafana', 'datadog', 'sentry', 'jenkins', 'gitlab',
    'github', 'terraform', 'ansible', 'helm', 'vector', 'load', 'balancer', 'topology', 'device',
    'hardware', 'cpu', 'memory', 'disk', 'volume', 'vm', 'container'
  ];

  return systemKeywords.some((keyword) => lower.includes(keyword));
}

function registerSystemDesignModuleIcons(
  moduleObj: Record<string, unknown>,
  source: IconCatalogEntry['source'],
  prefixCut: number = 0
) {
  if (!moduleObj) return;

  Object.keys(moduleObj).forEach((key) => {
    if (
      key.startsWith('createLucideIcon') ||
      key.startsWith('IconContext') ||
      key === 'default' ||
      key === '__esModule' ||
      key.endsWith('Props') ||
      key.endsWith('Context')
    ) {
      return;
    }

    const val = moduleObj[key];

    if (isValidIconComponent(val)) {
      const rawName = prefixCut > 0 ? key.slice(prefixCut) : key;
      const cleanName = rawName || key;

      if (!/^[A-Z]/.test(key) && !/^[A-Z]/.test(cleanName)) {
        return;
      }

      // Filter out non-system design icons
      if (!isSystemDesignIcon(cleanName)) {
        return;
      }

      const entry: IconCatalogEntry = {
        kind: `${source}-${key}`,
        name: cleanName,
        source,
        icon: val as React.ComponentType<{ className?: string; style?: React.CSSProperties }>,
      };

      dynamicCatalogMap.set(entry.kind, entry);
    }
  });
}

// Register System Design focused icons from SimpleIcons, Grommet, and Tabler
registerSystemDesignModuleIcons(SiIcons, 'simpleicons', 2);
registerSystemDesignModuleIcons(GrIcons, 'grommet', 2);
registerSystemDesignModuleIcons(TbIcons, 'tabler', 2);

// Map direct bundled React Icons for high-frequency architecture tech stacks
const SI_ICON_FALLBACKS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'iconify-kafka': SiIcons.SiApachekafka,
  'iconify-redis': SiIcons.SiRedis,
  'iconify-postgresql': SiIcons.SiPostgresql,
  'iconify-mongodb': SiIcons.SiMongodb,
  'iconify-mysql': SiIcons.SiMysql,
  'iconify-docker': SiIcons.SiDocker,
  'iconify-kubernetes': SiIcons.SiKubernetes,
  'iconify-nginx': SiIcons.SiNginx,
  'iconify-rabbitmq': SiIcons.SiRabbitmq,
  'iconify-prometheus': SiIcons.SiPrometheus,
  'iconify-grafana': SiIcons.SiGrafana,
  'iconify-auth0': SiIcons.SiAuth0,
  'iconify-graphql': SiIcons.SiGraphql,
  'iconify-swagger': SiIcons.SiSwagger,
  'iconify-socketio': SiIcons.SiSocketdotio,
};

// Register System Design Iconify curated list into dynamicCatalogMap
SYSTEM_DESIGN_ICONIFY_LIST.forEach((item) => {
  const directSiComp = SI_ICON_FALLBACKS[item.kind];
  let iconComp: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  if (directSiComp) {
    iconComp = function BundledIconWrapper(props) {
      return React.createElement(directSiComp, {
        className: props.className || 'h-full w-full',
        style: props.style,
      });
    };
  } else {
    iconComp = createIconifyComponent(item.iconId);
  }

  const entry: IconCatalogEntry = {
    kind: item.kind,
    name: item.name,
    source: 'iconify',
    icon: iconComp,
  };

  dynamicCatalogMap.set(entry.kind, entry);

  // Register alias without 'iconify-' prefix (e.g. 'kafka', 'redis', 'postgres', 'aws-ec2')
  const shortKind = item.kind.replace(/^iconify-/, '');
  if (!dynamicCatalogMap.has(shortKind)) {
    dynamicCatalogMap.set(shortKind, entry);
  }
});

export const ICON_CATALOG: IconCatalogEntry[] = Array.from(dynamicCatalogMap.values());

/** O(1) lookup map by icon kind — use instead of ICON_CATALOG.find() in render paths */
export const ICON_MAP: ReadonlyMap<string, IconCatalogEntry> = dynamicCatalogMap;

/**
 * Pure dynamic continuous character (substring) search algorithm for System Design icons.
 */
export function searchIconsDynamic(query: string, maxResults: number = 120): IconCatalogEntry[] {
  if (!query || query.trim() === '') {
    return ICON_CATALOG.slice(0, maxResults);
  }

  const q = query.trim().toLowerCase();

  // Continuous character substring matching
  const matches = ICON_CATALOG.filter((item) => {
    const nameLower = item.name.toLowerCase();
    const kindLower = item.kind.toLowerCase();

    return nameLower.includes(q) || kindLower.includes(q);
  });

  // Dynamic Iconify fallback if searching specific tech terms not locally scanned
  if (matches.length < 5 && q.length >= 2) {
    const dynamicIconifyId = `logos:${q}`;
    const dynamicKind = `iconify-dynamic-${q}`;
    if (!dynamicCatalogMap.has(dynamicKind)) {
      matches.unshift({
        kind: dynamicKind,
        name: `${query.toUpperCase()} (System Vector)`,
        source: 'iconify',
        icon: createIconifyComponent(dynamicIconifyId),
      });
    }
  }

  // Relevance ranking: exact match > startsWith > substring includes
  matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aScore = aName === q ? 0 : aName.startsWith(q) ? 1 : 2;
    const bScore = bName === q ? 0 : bName.startsWith(q) ? 1 : 2;

    return aScore - bScore;
  });

  return matches.slice(0, maxResults);
}
