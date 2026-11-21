import { useRef, useState } from "react";
import { ThreeDots } from "react-bootstrap-icons";
import { IconButton } from "./IconButton";
import { ActionMenu } from "./ActionMenu";

/**
 * RowActions: the shared pocket-style row action cluster, a primary IconButton
 * followed by a "More actions" menu. Revealed on hover / keyboard focus via
 * `.row-actions`, kept visible while the menu is open via `.row-actions--active`.
 *
 * This is the generic primitive behind EventRow, ListPanelRow and the expense
 * list. Pocket's widget-specific RowActions (copy / folders / change type)
 * lives at app/widgets/pocket/RowActions.jsx and is not this component.
 *
 * Props:
 *   primary - { label, icon, onClick } rendered as the leading IconButton
 *   items   - ActionMenu item array (the menu button is hidden when empty)
 */
export const RowActions = ({ primary, items = [] }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const moreRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    moreRef.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  return (
    <div
      className={`row-actions flex items-center gap-0.5 shrink-0 self-center ${menuAnchor ? "row-actions--active" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {primary && (
        <IconButton
          label={primary.label}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            primary.onClick();
          }}
        >
          {primary.icon}
        </IconButton>
      )}
      {items.length > 0 && (
        <IconButton
          label="More actions"
          size="sm"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={openMenu}
        >
          <ThreeDots size={14} />
        </IconButton>
      )}
      {menuAnchor && (
        <ActionMenu anchor={menuAnchor} triggerRef={moreRef} items={items} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  );
};

export default RowActions;
