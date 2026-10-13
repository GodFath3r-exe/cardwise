# CardWise

Static MVP: browse popular credit-card offers, open plain-language details, save cards you own.

## Open

From the project root:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173

Or double-click `index.html`.

## Tabs

1. **Explore cards** — search a spend category / merchant; rank matching offers with caps, fees, and ≈ ₹ back  
2. **My Cards** — cards you add (synced when signed in; product names only, never card numbers)

## Cards included

Popular India cards such as Axis Flipkart, HDFC Millennia, Amazon Pay ICICI, SBI Cashback, Axis ACE, and more.

Detail pages: `cards/view.html?id=<card-id>`
