class_name WindowBox
extends RefCounted
##
## The one piece of chrome the whole interface is built from.
##
## The reference has a single `win()` helper and every panel in the game is it: a deep blue
## fill, a lit top edge, four-pixel corners. The port had grown four hand-rolled copies of the
## same eight lines — the dialogue box, the field's read-out, and now a fight's two panels —
## which is three too many places for "what a window looks like" to live.

## Fill and edge come from the palette, which is data; the geometry is the reference's
## stylesheet, which is not.
static func panel(alpha := 0.94, margin := 22.0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Palette.ui_color("panelBottom")
	style.bg_color.a = alpha
	style.border_color = Palette.ui_color("panelEdgeLight")
	style.set_border_width_all(2)
	style.set_corner_radius_all(4)
	style.set_content_margin_all(margin)
	return style
