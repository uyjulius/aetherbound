class_name Shop
extends ListScreen
##
## Shops: buy, sell, leave.
##
## A port of `src/ui/shop.js`. The one thing this screen exists to do beyond taking
## money is show, for every member of the party, what a piece of equipment would do to
## them — the comparison *is* the decision, and making the player leave the shop to find
## out is the most annoying thing a store in this kind of game can do. So the panel names
## what each of them is wearing in that slot and the difference in attack and defence,
## signed, or says plainly that they cannot use it.
##
## Two rules the reference keeps and this keeps with it: the buy list re-reads what the
## party can afford after every purchase, so a row greys out the moment the gil runs
## short rather than at the next screen; and key items are not for sale, because a plot
## coupon sold for 25 gil is a save file that cannot finish the game.

## Which stat differences are worth a line. The reference compares these two and no
## others: they are the ones every piece of equipment moves.
const COMPARED := ["atk", "def"]

var _shop: Dictionary = {}
var _shop_id := ""


func _tag() -> String:
	return "SHOP"


## Open a shop by its id in the `shops` table. Nothing happens for an id that is not
## there, which is what the reference does — a broken shop should not eat the screen.
func open(shop_id: String, for_party: Party, db) -> bool:
	var found: Dictionary = db.shops.get(shop_id, {})
	if found.is_empty():
		push_warning("no shop called %s" % shop_id)
		return false
	_shop_id = shop_id
	_shop = found
	_begin(for_party, db)
	print("SHOP %s stock=%d" % [shop_id, _stock().size()])
	return true


func _stock() -> Array:
	var out: Array = []
	for id in _shop.get("stock", []):
		var item: Dictionary = database.items.get(String(id), {})
		if not item.is_empty():
			out.append(item)
	return out


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------

func _root() -> Dictionary:
	var rows: Array = [
		{"label": "Buy", "go": "buy"},
		{"label": "Sell", "go": "sell"},
		{"label": "Leave", "go": "leave"},
	]
	var on_select := func(row):
		match String(row.get("go", "")):
			"buy": _push(_buy())
			"sell": _push(_sell())
			"leave": close()
	return {
		"title": String(_shop.get("name", "Shop")), "rows": rows,
		"footer": "confirm choose · cancel leave",
		"on_select": on_select,
		"detail": func(_row): return "Choose Buy or Sell.",
	}


func _buy() -> Dictionary:
	var build := func() -> Array:
		var rows: Array = []
		for item in _stock():
			var price := int(item.get("price", 0))
			rows.append({
				"label": String(item.get("name", "?")), "right": str(price),
				"item": item,
				# Re-read every time the list is rebuilt, so a row greys out as the gil
				# goes rather than at the next screen.
				"disabled": party.gold < price,
			})
		if rows.is_empty():
			rows.append({"label": "(nothing in stock)", "disabled": true})
		return rows
	var on_select := func(row):
		var item: Dictionary = row.get("item", {})
		if item.is_empty():
			return
		if not party.spend_gold(int(item.get("price", 0))):
			return
		party.add_item(String(item.get("id", "")), 1)
		print("BOUGHT %s gold=%d" % [String(item.get("id", "")), party.gold])
		Telemetry.track(Telemetry.ITEM_BOUGHT, {
			"item": String(item.get("id", "")), "price": int(item.get("price", 0)),
			"gold_after": party.gold})
	return {
		"title": "Buy", "rows": build.call(), "rebuild": build,
		"footer": "confirm buy · cancel back · special reads the comparison out",
		"on_select": on_select,
		"on_special": func(row): _say_comparison(row.get("item", {})),
		"detail": func(row): return _item_panel(row.get("item", {})),
	}


func _sell() -> Dictionary:
	var build := func() -> Array:
		var rows: Array = []
		var ids: Array = party.inventory.keys()
		ids.sort()
		for id in ids:
			var item: Dictionary = database.items.get(String(id), {})
			# Key items stay put. A plot coupon sold for 25 gil is a save file that
			# cannot finish the game.
			if item.is_empty() or String(item.get("kind", "")) == "key":
				continue
			rows.append({
				"label": String(item.get("name", id)),
				"right": "x%d  %d" % [party.count_item(String(id)), int(item.get("sell", 0))],
				"item": item,
			})
		if rows.is_empty():
			rows.append({"label": "(nothing to sell)", "disabled": true})
		return rows
	var on_select := func(row):
		var item: Dictionary = row.get("item", {})
		if item.is_empty():
			return
		if not party.remove_item(String(item.get("id", "")), 1):
			return
		party.add_gold(int(item.get("sell", 0)))
		print("SOLD %s gold=%d" % [String(item.get("id", "")), party.gold])
		Telemetry.track(Telemetry.ITEM_SOLD, {
			"item": String(item.get("id", "")), "gold_after": party.gold})
	return {
		"title": "Sell", "rows": build.call(), "rebuild": build,
		"footer": "confirm sell · cancel back · special reads the comparison out",
		"on_select": on_select,
		"on_special": func(row): _say_comparison(row.get("item", {})),
		"detail": func(row): return _item_panel(row.get("item", {})),
	}


# ---------------------------------------------------------------------------
# The panel
# ---------------------------------------------------------------------------

## The comparison, in one line, on demand.
##
## The panel is the reason this screen exists, and a screen check that only proves the
## store *opens* would pass with the comparison blank. This is the same text the panel
## builds, printed where something outside the game can read it.
func _say_comparison(item: Dictionary) -> void:
	var slot := String(item.get("slot", ""))
	if item.is_empty() or slot.is_empty():
		print("SHOP_COMPARE %s nothing-to-compare" % String(item.get("id", "-")))
		return
	var parts: Array = []
	for member in party.active_members():
		parts.append(_comparison(member, item, slot).strip_edges())
	print("SHOP_COMPARE %s | %s" % [String(item.get("id", "?")), " | ".join(parts)])


func _item_panel(item: Dictionary) -> String:
	if item.is_empty():
		return ""
	var lines: Array = [String(item.get("name", "?"))]
	var desc := String(item.get("desc", ""))
	if not desc.is_empty():
		lines.append(desc)
	var stats: Dictionary = item.get("stats", {})
	if not stats.is_empty():
		var parts: Array = []
		for key in stats:
			parts.append("%s %s%d" % [String(key).to_upper(),
				"+" if int(stats[key]) > 0 else "", int(stats[key])])
		lines.append("   ".join(parts))
	lines.append("Buy %d    Sell %d    Held %d" % [int(item.get("price", 0)),
		int(item.get("sell", 0)), party.count_item(String(item.get("id", "")))])

	var slot := String(item.get("slot", ""))
	if not slot.is_empty():
		lines.append("")
		lines.append("If equipped")
		for member in party.active_members():
			lines.append(_comparison(member, item, slot))
	return "\n".join(lines)


## One member's line: what they have on, and what this would change.
##
## The comparison is between the two *pieces*, as in the reference — the piece coming off
## against the piece going on — rather than a refit of the whole character. A shop is a
## decision about one slot.
func _comparison(member: Party.Member, item: Dictionary, slot: String) -> String:
	if not member.is_equippable(item):
		return "  %-10s cannot equip" % member.name()
	var worn: Dictionary = member.equipment.get(slot, {})
	var worn_stats: Dictionary = worn.get("stats", {})
	var new_stats: Dictionary = item.get("stats", {})
	var parts: Array = []
	for key in COMPARED:
		var delta := int(new_stats.get(key, 0)) - int(worn_stats.get(key, 0))
		if delta != 0:
			parts.append("%s %s%d" % [key.to_upper(), "+" if delta > 0 else "", delta])
	return "  %-10s %-20s %s" % [member.name(),
		String(worn.get("name", "-")), "   ".join(parts)]
