/**
 * ADA Opera — Feature Sidebar
 * Navigation through the 12×4×4 feature tree
 */

import { featureTree, countNodes, type Feature, type SubSkill } from "../../lib/feature-tree";
import { useOperaStore } from "../../stores/opera-store";
import { useT } from "../../lib/i18n";

export function Sidebar() {
  const t = useT();
  const activeFeatureId = useOperaStore((s) => s.activeFeatureId);
  const activeSubSkillId = useOperaStore((s) => s.activeSubSkillId);
  const setActiveFeature = useOperaStore((s) => s.setActiveFeature);
  const setActiveSubSkill = useOperaStore((s) => s.setActiveSubSkill);
  const sidebarOpen = useOperaStore((s) => s.sidebarOpen);

  const stats = countNodes();
  const activeFeature = featureTree.find((f) => f.id === activeFeatureId);

  if (!sidebarOpen) return null;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">{t("sidebar_title")}</span>
        <span className="sidebar-stats">{t("sidebar_nodes", { count: stats.total })}</span>
      </div>

      {/* Feature list */}
      <div className="sidebar-features">
        {featureTree.map((feature) => (
          <button
            key={feature.id}
            className={`sidebar-feature-btn ${activeFeatureId === feature.id ? "active" : ""}`}
            onClick={() => setActiveFeature(feature.id === activeFeatureId ? null : feature.id)}
          >
            <span className="feature-icon">{feature.icon}</span>
            <span className="feature-label">{feature.label}</span>
            <span className="feature-badge">{feature.subSkills.length * 4}</span>
          </button>
        ))}
      </div>

      {/* SubSkill panel (when feature is selected) */}
      {activeFeature && (
        <div className="sidebar-subskills">
          <div className="subskill-header">{activeFeature.label}</div>
          {activeFeature.subSkills.map((sub) => (
            <button
              key={sub.id}
              className={`sidebar-sub-btn ${activeSubSkillId === sub.id ? "active" : ""}`}
              onClick={() => setActiveSubSkill(sub.id === activeSubSkillId ? null : sub.id)}
            >
              <span className="sub-icon">{sub.icon}</span>
              <span className="sub-label">{sub.label}</span>
              <span className="sub-count">{sub.deepSkills.length}</span>
            </button>
          ))}

          {/* DeepSkill panel */}
          {activeSubSkillId && (
            <div className="sidebar-deepskills">
              {activeFeature.subSkills
                .find((s) => s.id === activeSubSkillId)
                ?.deepSkills.map((deep) => (
                  <div key={deep.id} className="deepskill-item">
                    <span className="deep-icon">{deep.icon}</span>
                    <span className="deep-label">{deep.label}</span>
                    <span className={`deep-type type-${deep.type}`}>{deep.type}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
