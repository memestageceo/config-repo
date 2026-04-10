import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started →
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <div className={clsx('col col--3', styles.featureCard)}>
      <Link to={link} className={styles.featureLink}>
        <div className="card padding--lg">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

const features = [
  {
    title: 'Kubernetes',
    description:
      'Cluster setup, networking, security (RBAC, NetworkPolicy), storage, workloads, and hands-on exercises.',
    link: '/docs/kubernetes',
  },
  {
    title: 'Debugging',
    description:
      'Practical troubleshooting guides for Kubernetes and application-level debugging workflows.',
    link: '/docs/debugging',
  },
  {
    title: 'Linux & System',
    description:
      'Arch Linux guides covering GPU setup, KVM/QEMU virtualization, SSH/GPG, and display configuration.',
    link: '/docs/linux',
  },
  {
    title: 'WordPress',
    description:
      'Deploying and troubleshooting WordPress on Kubernetes with Kind.',
    link: '/docs/wordpress',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Kubernetes, Linux, and DevOps reference guides">
      <HomepageHero />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
