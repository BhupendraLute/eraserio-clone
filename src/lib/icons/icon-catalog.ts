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
      className: props.className || 'h-5 w-5',
      style: props.style,
    });
  };
}

// System Design & Cloud Architecture Iconify Collection
const SYSTEM_DESIGN_ICONIFY_LIST: { kind: string; name: string; iconId: string }[] = [
  { kind: 'iconify-aws-ec2', name: 'EC2 (AWS Compute)', iconId: 'logos:aws-ec2' },
  { kind: 'iconify-aws-elb', name: 'Load Balancer (AWS ELB/ALB)', iconId: 'logos:aws-elb' },
  { kind: 'iconify-aws-s3', name: 'S3 (AWS Object Storage)', iconId: 'logos:aws-s3' },
  { kind: 'iconify-aws-rds', name: 'RDS (AWS Relational DB)', iconId: 'logos:aws-rds' },
  { kind: 'iconify-aws-lambda', name: 'Lambda (AWS Serverless)', iconId: 'logos:aws-lambda' },
  { kind: 'iconify-aws-sqs', name: 'SQS (AWS Message Queue)', iconId: 'logos:aws-sqs' },
  { kind: 'iconify-aws-dynamodb', name: 'DynamoDB (AWS NoSQL)', iconId: 'logos:aws-dynamodb' },
  { kind: 'iconify-aws-cloudfront', name: 'CloudFront (AWS CDN)', iconId: 'logos:aws-cloudfront' },
  { kind: 'iconify-aws-route53', name: 'Route 53 (AWS DNS)', iconId: 'logos:aws-route53' },
  { kind: 'iconify-aws-api-gateway', name: 'API Gateway (AWS)', iconId: 'logos:aws-api-gateway' },
  { kind: 'iconify-redis', name: 'Redis Cache & Store', iconId: 'logos:redis' },
  { kind: 'iconify-rabbitmq', name: 'RabbitMQ Message Broker', iconId: 'logos:rabbitmq-icon' },
  { kind: 'iconify-kafka', name: 'Apache Kafka Event Stream', iconId: 'logos:apache-kafka' },
  { kind: 'iconify-docker', name: 'Docker Container', iconId: 'logos:docker-icon' },
  { kind: 'iconify-kubernetes', name: 'Kubernetes Cluster', iconId: 'logos:kubernetes' },
  { kind: 'iconify-nginx', name: 'Nginx Web Server Proxy', iconId: 'logos:nginx' },
  { kind: 'iconify-postgresql', name: 'PostgreSQL Database', iconId: 'logos:postgresql' },
  { kind: 'iconify-mongodb', name: 'MongoDB NoSQL Database', iconId: 'logos:mongodb-icon' },
  { kind: 'iconify-graphql', name: 'GraphQL API Engine', iconId: 'logos:graphql' },
  { kind: 'iconify-prometheus', name: 'Prometheus Metrics', iconId: 'logos:prometheus' },
  { kind: 'iconify-grafana', name: 'Grafana Dashboard', iconId: 'logos:grafana' },
  { kind: 'iconify-elasticsearch', name: 'Elasticsearch Engine', iconId: 'logos:elasticsearch' },
];

SYSTEM_DESIGN_ICONIFY_LIST.forEach((item) => {
  dynamicCatalogMap.set(item.kind, {
    kind: item.kind,
    name: item.name,
    source: 'iconify',
    icon: createIconifyComponent(item.iconId),
  });
});

function isValidIconComponent(val: any): boolean {
  if (!val) return false;
  if (typeof val === 'function') return true;
  if (typeof val === 'object' && val !== null) {
    if (typeof val.render === 'function') return true;
    if (val.$$typeof && typeof val.$$typeof === 'symbol') return true;
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
  moduleObj: Record<string, any>,
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

export const ICON_CATALOG: IconCatalogEntry[] = Array.from(dynamicCatalogMap.values());

/**
 * Pure dynamic continuous character (substring) search algorithm for System Design icons.
 */
export function searchIconsDynamic(query: string, maxResults: number = 120): IconCatalogEntry[] {
  if (!query || query.trim() === '') {
    return ICON_CATALOG.slice(0, maxResults);
  }

  const q = query.trim().toLowerCase();

  // Continuous character substring matching
  let matches = ICON_CATALOG.filter((item) => {
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
