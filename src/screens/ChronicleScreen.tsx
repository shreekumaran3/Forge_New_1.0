import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { LegacyDashboard } from '../components/chronicle/LegacyDashboard';
import { TimelineTab } from '../components/chronicle/TimelineTab';
import { LifeChaptersTab } from '../components/chronicle/LifeChaptersTab';
import { MilestonesTab } from '../components/chronicle/MilestonesTab';
import { ReflectionsTab } from '../components/chronicle/ReflectionsTab';
import { LessonsLearnedTab } from '../components/chronicle/LessonsLearnedTab';
import { MemoryCapsuleModal } from '../components/chronicle/MemoryCapsuleModal';
import { YearInReviewModal } from '../components/chronicle/YearInReviewModal';
import { CategoryGrid, CategoryGridItem } from '../components/ui/CategoryGrid';
import { Calendar, BookOpen, Award, Lightbulb, Quote } from 'lucide-react';

export const ChronicleScreen: React.FC = () => {
  const [itemsLimit, setItemsLimit] = useState(60);

  // Live Database Queries with demand-driven loading for mobile performance
  const chronicleItems = useLiveQuery(
    () => db.chronicle.orderBy('date').reverse().limit(itemsLimit).toArray(),
    [itemsLimit]
  ) || [];

  // Active Tab state (5 sections)
  const [activeTab, setActiveTab] = useState<'timeline' | 'chapters' | 'milestones' | 'reflections' | 'lessons'>('timeline');

  useEffect(() => {
    const handleSubTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ subTab?: 'timeline' | 'chapters' | 'milestones' | 'reflections' | 'lessons' }>;
      if (customEvent.detail?.subTab) {
        setActiveTab(customEvent.detail.subTab);
      }
    };
    window.addEventListener('chronicle_set_subtab', handleSubTabEvent);
    return () => window.removeEventListener('chronicle_set_subtab', handleSubTabEvent);
  }, []);

  // Modals state
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);
  const [isYearInReviewOpen, setIsYearInReviewOpen] = useState(false);

  // Demand-driven queries for heavy/secondary datasets
  const chapters = useLiveQuery(
    () => (activeTab === 'chapters' ? db.chapters.toArray() : Promise.resolve([])),
    [activeTab]
  ) || [];

  const milestones = useLiveQuery(
    () => (activeTab === 'chapters' || activeTab === 'milestones' || isCapsuleModalOpen || isYearInReviewOpen ? db.legacyMilestones.toArray() : Promise.resolve([])),
    [activeTab, isCapsuleModalOpen, isYearInReviewOpen]
  ) || [];

  const principles = useLiveQuery(
    () => (activeTab === 'lessons' || isYearInReviewOpen ? db.principles.toArray() : Promise.resolve([])),
    [activeTab, isYearInReviewOpen]
  ) || [];

  const records = useLiveQuery(
    () => (isYearInReviewOpen ? db.personalRecords.toArray() : Promise.resolve([])),
    [isYearInReviewOpen]
  ) || [];

  const capsules = useLiveQuery(
    () => (isCapsuleModalOpen ? db.memoryCapsules.toArray() : Promise.resolve([])),
    [isCapsuleModalOpen]
  ) || [];

  // Reflections count memoized
  const reflectionsCount = React.useMemo(() => {
    return chronicleItems.filter(
      (item) => item.category === 'reflection' || item.lessonLearned
    ).length;
  }, [chronicleItems]);

  // Journeys count memoized
  const journeysCount = React.useMemo(() => {
    return chronicleItems.filter(
      (item) => item.title.toLowerCase().includes('retention') || item.title.toLowerCase().includes('journey')
    ).length;
  }, [chronicleItems]);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Living Legacy Summary Header */}
      <div data-system-guide="chronicle-dashboard">
        <LegacyDashboard
          chronicleItems={chronicleItems}
          chapters={chapters}
          milestones={milestones}
          reflectionsCount={reflectionsCount}
          journeysCount={journeysCount}
          onOpenCapsules={() => setIsCapsuleModalOpen(true)}
          onOpenYearInReview={() => setIsYearInReviewOpen(true)}
        />
      </div>

      {/* 2. Main 5 Section Navigation Grid */}
      <div className="border-b border-[var(--forge-border)] pb-3">
        <CategoryGrid variant="primary" cols={5}>
          <CategoryGridItem
            id="timeline"
            label="Timeline"
            count={chronicleItems.length}
            icon={<Calendar className="w-4 h-4 text-[var(--forge-text-accent)]" />}
            isActive={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
          />
          <CategoryGridItem
            id="chapters"
            label="Life Chapters"
            count={chapters.length}
            icon={<BookOpen className="w-4 h-4 text-[var(--forge-text-accent)]" />}
            isActive={activeTab === 'chapters'}
            onClick={() => setActiveTab('chapters')}
          />
          <CategoryGridItem
            id="milestones"
            label="Milestones"
            count={milestones.filter((m) => m.isUnlocked).length}
            icon={<Award className="w-4 h-4 text-[var(--forge-text-accent)]" />}
            isActive={activeTab === 'milestones'}
            onClick={() => setActiveTab('milestones')}
          />
          <CategoryGridItem
            id="reflections"
            label="Reflections"
            count={reflectionsCount}
            icon={<Lightbulb className="w-4 h-4 text-[var(--forge-text-accent)]" />}
            isActive={activeTab === 'reflections'}
            onClick={() => setActiveTab('reflections')}
          />
          <CategoryGridItem
            id="lessons"
            label="Lessons"
            count={principles.length}
            icon={<Quote className="w-4 h-4 text-[var(--forge-text-accent)]" />}
            isActive={activeTab === 'lessons'}
            onClick={() => setActiveTab('lessons')}
          />
        </CategoryGrid>
      </div>

      {/* 3. Section Content Display */}
      {activeTab === 'timeline' && (
        <div data-system-guide="chronicle-timeline">
          <TimelineTab
            chronicleItems={chronicleItems}
            onLoadMore={() => setItemsLimit((prev) => prev + 60)}
            hasMore={chronicleItems.length >= itemsLimit}
          />
        </div>
      )}

      {activeTab === 'chapters' && (
        <div data-system-guide="chronicle-chapters">
          <LifeChaptersTab chapters={chapters} milestones={milestones} />
        </div>
      )}

      {activeTab === 'milestones' && (
        <div data-system-guide="chronicle-milestones">
          <MilestonesTab milestones={milestones} />
        </div>
      )}

      {activeTab === 'reflections' && (
        <div data-system-guide="chronicle-reflections">
          <ReflectionsTab chronicleItems={chronicleItems} />
        </div>
      )}

      {activeTab === 'lessons' && (
        <div data-system-guide="chronicle-lessons">
          <LessonsLearnedTab principles={principles} />
        </div>
      )}

      {/* 4. Memory Capsule Modal */}
      <MemoryCapsuleModal
        isOpen={isCapsuleModalOpen}
        onClose={() => setIsCapsuleModalOpen(false)}
        capsules={capsules}
        milestones={milestones}
      />

      {/* 5. Year in Review Modal */}
      <YearInReviewModal
        isOpen={isYearInReviewOpen}
        onClose={() => setIsYearInReviewOpen(false)}
        year="2026"
        chronicleItems={chronicleItems}
        milestones={milestones}
        records={records}
        principles={principles}
      />
    </div>
  );
};
