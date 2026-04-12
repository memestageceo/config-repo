import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function Badge({ children }: { children: ReactNode }) {
  return <span className={styles.badge}>{children}</span>;
}

function HomepageHero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroGlow} aria-hidden />
      <div className="container">
        <Badge>DevOps · Kubernetes · Cloud · Linux</Badge>
        <Heading as="h1" className={styles.heroTitle}>
          Configs that work,
          <br />
          <span className={styles.heroTitleAccent}>served with explanations</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          Hands-on guides for real-world infrastructure — written by a developer
          who's been in the trenches.
        </p>
        <div className={styles.buttons}>
          <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/intro">
            Browse Docs →
          </Link>
          <Link className={clsx('button button--lg', styles.btnSecondary)} to="/blog">
            Read the Blog
          </Link>
        </div>
        <p className={styles.authorNote}>
          By{' '}
          <Link to="https://www.linkedin.com/in/aditya-raj-content-creator/">
            Aditya Raj
          </Link>{' '}
          · Technical writer &amp; developer advocate · also on{' '}
          <Link to="https://www.youtube.com/@memestagestartup">YouTube</Link>
        </p>
      </div>
    </header>
  );
}

function StatsStrip() {
  const stats = [
    { value: '4', label: 'Topic areas' },
    { value: '∞', label: 'Hands-on guides' },
    { value: '100%', label: 'Open source' },
    { value: '0', label: 'Paywalls' },
  ];
  return (
    <div className={styles.statsStrip}>
      <div className="container">
        <div className={styles.statsRow}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BentoGrid() {
  return (
    <section className={styles.bentoSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Everything you need to ship
          </Heading>
          <p className={styles.sectionSubtitle}>
            From bare-metal clusters to production-grade deployments.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Large featured card */}
          <Link to="/docs/kubernetes" className={clsx(styles.bentoCard, styles.bentoBig)}>
            <div className={styles.bentoIcon}>☸️</div>
            <Heading as="h3" className={styles.bentoTitle}>Kubernetes</Heading>
            <p className={styles.bentoDesc}>
              End-to-end cluster setup, RBAC &amp; NetworkPolicy security,
              persistent storage, workloads, and guided hands-on exercises.
            </p>
            <span className={styles.bentoArrow}>Explore →</span>
          </Link>

          {/* Debugging */}
          <Link to="/docs/debugging" className={styles.bentoCard}>
            <div className={styles.bentoIcon}>🔍</div>
            <Heading as="h3" className={styles.bentoTitle}>Debugging</Heading>
            <p className={styles.bentoDesc}>
              Practical troubleshooting playbooks for Kubernetes pods,
              networking, and application-level issues.
            </p>
            <span className={styles.bentoArrow}>Explore →</span>
          </Link>

          {/* Linux */}
          <Link to="/docs/linux" className={styles.bentoCard}>
            <div className={styles.bentoIcon}>🐧</div>
            <Heading as="h3" className={styles.bentoTitle}>Linux &amp; System</Heading>
            <p className={styles.bentoDesc}>
              Arch Linux, GPU passthrough, KVM/QEMU virtualisation,
              SSH/GPG hardening, and display configuration.
            </p>
            <span className={styles.bentoArrow}>Explore →</span>
          </Link>

          {/* WordPress */}
          <Link to="/docs/wordpress" className={styles.bentoCard}>
            <div className={styles.bentoIcon}>🌐</div>
            <Heading as="h3" className={styles.bentoTitle}>WordPress</Heading>
            <p className={styles.bentoDesc}>
              Deploy and troubleshoot WordPress on Kubernetes with Kind —
              from zero to running in minutes.
            </p>
            <span className={styles.bentoArrow}>Explore →</span>
          </Link>

          {/* Blog CTA card */}
          <Link to="/blog" className={clsx(styles.bentoCard, styles.bentoCta)}>
            <div className={styles.bentoIcon}>✍️</div>
            <Heading as="h3" className={styles.bentoTitle}>Blog</Heading>
            <p className={styles.bentoDesc}>
              Docs are serious. Blogs, not so much. Opinions, deep dives,
              and war stories from the field.
            </p>
            <span className={styles.bentoArrow}>Read latest →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className={styles.bottomCta}>
      <div className="container">
        <Heading as="h2" className={styles.ctaTitle}>
          Ready to stop guessing and start shipping?
        </Heading>
        <p className={styles.ctaSubtitle}>
          Pick a topic and follow along — every guide is self-contained.
        </p>
        <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/intro">
          Get started →
        </Link>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Hands-on DevOps, Kubernetes, and cloud guides.">
      <HomepageHero />
      <main>
        <StatsStrip />
        <BentoGrid />
        <BottomCta />
      </main>
    </Layout>
  );
}

