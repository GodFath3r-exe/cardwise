# CardWise

Static MVP: browse popular credit-card offers, open plain-language details, save cards you own.

## Open

Double-click `index.html`, or:

```bash
cd /Users/ritiksingh/Documents/Tools/Office/cardwise
python3 -m http.server 5173
```

Then open http://localhost:5173

## Tabs

1. **Card Offers** — “Manage your card offers here” + 5 popular cards  
2. **My Cards** — cards you add (saved in browser `localStorage`, names only)

## Cards included

- Axis Flipkart  
- HDFC Millennia  
- Amazon Pay ICICI  
- SBI Cashback  
- Axis ACE  

Detail pages: `cards/view.html?id=<card-id>`
