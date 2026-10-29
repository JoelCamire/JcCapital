/* Capsule 1 — CELI. Sources des chiffres : voir scripts.md */
VIDEOS.celi = {
  label: 'CAPSULE · CELI',
  scenes: [
    { d: 4.2, name: 'Accroche', draw(lt) {
      kicker('IDÉE REÇUE', lt, 560);
      const g = words('« Le CELI, c’est juste un compte d’épargne. »', MX, 720, { size: 96, t0: 0.15, stagger: 0.075 }, lt);
      strike(g, lt, 2.25);
      stamp('Faux.', W / 2, 1290, 260, lt, 2.55);
    } },
    { d: 8, name: 'Ce que c’est', draw(lt) {
      kicker('CE QUE C’EST', lt, 430);
      acronym(['C', 'E', 'L', 'I'], ['Compte', 'd’épargne', 'libre', 'd’impôt'], 680, lt, 0.1);
      words('Un compte où intérêts, dividendes et gains sont *à~l’abri de~l’impôt.*', MX, 960, { size: 78, t0: 2.0, stagger: 0.07 }, lt);
      const p = prog(lt, 3.4, 1.4);
      halo(W / 2, 1410, 190, p);
      icon('shield', W / 2, 1410, 210, p, { lw: 7 });
    } },
    { d: 7, name: 'Mécanisme 1', draw(lt) {
      kicker('MÉCANISME 1 · LES DROITS', lt, 430);
      words('Chaque année, de nouveaux droits de cotisation.', MX, 580, { size: 76, t0: 0.15, stagger: 0.06 }, lt);
      const p = E.out5(prog(lt, 1.0, 1.6));
      if (lt > 1.0) big(fmt(7000 * p) + ' $', MX - 6, 1010, 250);
      mono('PLAFOND ANNUEL 2026', MX, 1080, { alpha: E.out3(prog(lt, 1.6, 0.5)) });
      hline(MX, MX + CW, 1150, E.inOut3(prog(lt, 1.8, 0.8)), { alpha: 0.4, lw: 2 });
      words('Les droits inutilisés *s’accumulent* d’année en année, dès 18~ans.', MX, 1260, { size: 64, weight: 500, t0: 2.4, stagger: 0.05 }, lt);
    } },
    { d: 8.6, name: 'Exemple cumul', draw(lt) {
      kicker('EXEMPLE', lt, 430);
      words('Exemple : 18 ans en 2009, aucune cotisation depuis.', MX, 580, { size: 72, t0: 0.15, stagger: 0.06 }, lt);
      const lim = [5000, 5000, 5000, 5000, 5500, 5500, 10000, 5500, 5500, 5500, 6000, 6000, 6000, 6000, 6500, 7000, 7000, 7000];
      const base = 1440, n = lim.length, gap = 10, bw = (CW - gap * (n - 1)) / n, t0 = 1.3, step = 0.17;
      let sum = 0;
      lim.forEach((v, i) => {
        const p = prog(lt, t0 + i * step, 0.5);
        sum += v * E.out3(p);
        vbar(MX + i * (bw + gap), base, bw, v / 10000 * 300, p, { r: 6, fill: i === n - 1 ? goldGrad(base - 300, base) : 'rgba(198,172,143,0.55)' });
      });
      hline(MX, MX + CW, base + 2, prog(lt, 1.1, 0.6), { alpha: 0.5, lw: 2 });
      mono('2009', MX, base + 50, { size: 26, alpha: prog(lt, 1.3, 0.5), color: C.beige });
      mono('2026', MX + CW, base + 50, { size: 26, align: 'right', alpha: prog(lt, 4.2, 0.5), color: C.beige });
      if (lt > 1.3) big(fmt(sum) + ' $', MX - 6, 890, 180);
      words('de droits cumulés possibles en 2026', MX, 980, { size: 56, weight: 500, color: C.beige, t0: 4.6, stagger: 0.05 }, lt);
    } },
    { d: 8.2, name: 'Mécanisme 2', draw(lt) {
      kicker('MÉCANISME 2 · LES RETRAITS', lt, 430);
      words('Un retrait ? *Aucun impôt* sur le montant retiré.', MX, 590, { size: 80, t0: 0.15, stagger: 0.07 }, lt);
      // boîte -> pièce -> calendrier
      const y = 1000;
      icon('box', 260, y, 200, prog(lt, 1.0, 0.9), { lw: 6 });
      const mv = E.inOut3(prog(lt, 2.0, 1.2));
      const back = E.inOut3(prog(lt, 4.6, 1.2));
      const cx = 260 + (540 - 260) * mv - (540 - 260) * back * 0, cy = y - 40 - Math.sin(mv * Math.PI) * 120;
      if (lt > 1.8 && back < 1) icon('coin', back > 0 ? 540 + (820 - 540) * back : cx, back > 0 ? cy - Math.sin(back * Math.PI) * 80 : cy, 110, prog(lt, 1.8, 0.4), { lw: 6 });
      icon('calendar', 820, y, 230, prog(lt, 3.0, 0.9), { lw: 6 });
      text('1er JANV.', 820, y + 52, { size: 30, weight: 800, align: 'center', color: C.beige, alpha: E.out3(prog(lt, 3.6, 0.5)) });
      if (back >= 1) halo(820, y, 170, prog(lt, 5.8, 0.6));
      words('Le montant retiré redevient des droits le *1er janvier suivant.*', MX, 1300, { size: 64, weight: 500, t0: 3.4, stagger: 0.05 }, lt);
    } },
    { d: 7.4, name: 'Pour qui', draw(lt) {
      kicker('POUR QUI', lt, 430);
      words('Utile pour presque tous les projets :', MX, 590, { size: 80, t0: 0.15, stagger: 0.07 }, lt);
      checklist(['Un fonds d’urgence', 'Un projet à court terme', 'L’épargne à long terme'], MX, 900, 150, lt, 1.2, 0.7);
      words('Dès 18 ans, pour les résidents du Canada.', MX, 1400, { size: 54, weight: 500, color: C.beige, t0: 3.6, stagger: 0.05 }, lt);
    } },
    { d: 8.6, name: 'Erreur fréquente', draw(lt) {
      kicker('ERREUR FRÉQUENTE', lt, 430);
      halo(MX + 90, 620, 120, prog(lt, 0.1, 0.8));
      icon('warning', MX + 90, 616, 150, prog(lt, 0.1, 0.9), { lw: 7 });
      words('Retirer, puis *recotiser la même année.*', MX, 860, { size: 88, t0: 0.5, stagger: 0.08 }, lt);
      card(MX - 20, 1170, CW + 40, 300, prog(lt, 2.4, 0.6));
      words('Sans droits suffisants : impôt de *1 % par mois* sur l’excédent.', MX + 30, 1270, { size: 64, weight: 500, maxW: CW - 60, t0: 2.7, stagger: 0.05 }, lt);
    } },
    { d: 6.5, name: 'Fin', draw(lt) { endScene(lt); } }
  ]
};
