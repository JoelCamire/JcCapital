/* Capsule 4 — REEI. Sources des chiffres : voir scripts.md */
VIDEOS.reei = {
  label: 'CAPSULE · REEI',
  scenes: [
    { d: 4.4, name: 'Accroche', draw(lt) {
      kicker('QUESTION', lt, 560);
      words('Jusqu’à *3~$* du gouvernement pour chaque *1~$* épargné ?', MX, 720, { size: 96, t0: 0.15, stagger: 0.08 }, lt);
      stamp('Oui.', W / 2, 1230, 220, lt, 2.5);
      words('Pour les personnes admissibles.', W / 2, 1420, { size: 56, weight: 500, color: C.beige, align: 'center', t0: 2.9, stagger: 0.06 }, lt);
    } },
    { d: 8, name: 'Ce que c’est', draw(lt) {
      kicker('CE QUE C’EST', lt, 430);
      acronym(['R', 'E', 'E', 'I'], ['Régime', 'enregistré', 'd’épargne', 'invalidité'], 680, lt, 0.1);
      words('Une épargne à long terme pour une personne admissible au *crédit d’impôt pour personnes handicapées.*', MX, 960, { size: 66, t0: 2.0, stagger: 0.06 }, lt);
      const p = prog(lt, 3.8, 1.3);
      halo(W / 2, 1450, 160, p);
      icon('heart', W / 2, 1450, 160, p, { lw: 7 });
    } },
    { d: 9, name: 'Mécanisme 1', draw(lt) {
      kicker('MÉCANISME 1 · LA SUBVENTION', lt, 430);
      words('Exemple : vous cotisez 1 500 $ dans l’année.', MX, 580, { size: 70, t0: 0.15, stagger: 0.06 }, lt);
      const rows = [['500 $', '× 3', 1500, 1.3], ['1 000 $', '× 2', 2000, 2.1]];
      rows.forEach(([a, m, v, t0], i) => {
        const y = 800 + i * 150, q = E.out3(prog(lt, t0, 0.5));
        text(a, MX, y, { size: 60, weight: 800, color: C.text, alpha: q });
        text(m, MX + 250, y, { size: 60, weight: 800, gold: true, alpha: q });
        const bw = (CW - 600) * v / 2000, p = E.out3(prog(lt, t0 + 0.3, 0.7));
        if (p > 0) { ctx.save(); rrect(MX + 400, y - 50, bw * p, 64, 12); ctx.fillStyle = goldGrad(y - 50, y + 14); ctx.fill(); ctx.restore(); }
        text(fmt(v * p) + ' $', MX + 400 + bw * p + 20, y, { size: 50, weight: 800, color: C.beige, alpha: p });
      });
      hline(MX, MX + CW, 1050, E.inOut3(prog(lt, 2.9, 0.6)), { alpha: 0.4, lw: 2 });
      const s = E.out5(prog(lt, 3.1, 1.2));
      if (lt > 3.1) big(fmt(3500 * s) + ' $', MX - 6, 1230, 180);
      mono('DE SUBVENTION · MAXIMUM ANNUEL', MX, 1300, { alpha: E.out3(prog(lt, 3.6, 0.5)) });
      words('Si le revenu familial est de 117 045 $ ou moins (seuil 2026). Maximum à vie : 70 000 $.', MX, 1410, { size: 46, weight: 500, color: C.beige, t0: 4.2, stagger: 0.04, lh: 1.2 }, lt);
    } },
    { d: 7.6, name: 'Mécanisme 2', draw(lt) {
      kicker('MÉCANISME 2 · LE BON', lt, 430);
      const a = E.out5(prog(lt, 0.2, 1.3));
      if (lt > 0.2) big(fmt(1000 * a) + ' $', MX - 6, 720, 230);
      mono('PAR ANNÉE, AU MAXIMUM', MX, 790, { alpha: E.out3(prog(lt, 0.8, 0.5)) });
      words('*Aucune cotisation* requise pour le recevoir.', MX, 950, { size: 76, t0: 1.3, stagger: 0.07 }, lt);
      card(MX - 20, 1150, CW + 40, 300, prog(lt, 2.8, 0.6));
      words('Montant complet si le revenu familial est de 38 237 $ ou moins (2026). Maximum à vie : 20 000 $.', MX + 30, 1240, { size: 48, weight: 500, maxW: CW - 60, t0: 3.0, stagger: 0.04, lh: 1.2 }, lt);
    } },
    { d: 7.6, name: 'Mécanisme 3', draw(lt) {
      kicker('MÉCANISME 3 · LE RATTRAPAGE', lt, 430);
      words('Ouvert plus tard ? Subventions et bons des *10~années précédentes* récupérables.', MX, 580, { size: 70, t0: 0.15, stagger: 0.06 }, lt);
      const n = 10, gap = 12, bw = (CW - gap * (n - 1)) / n, y = 1000;
      for (let i = 0; i < n; i++) {
        const p = prog(lt, 1.8 + i * 0.13, 0.4), x = MX + i * (bw + gap);
        ctx.save(); rrect(x, y, bw, bw, 10); ctx.strokeStyle = 'rgba(198,172,143,0.35)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        if (p > 0) { ctx.save(); ctx.globalAlpha *= E.out3(p); rrect(x + 6, y + 6, bw - 12, bw - 12, 8); ctx.fillStyle = goldGrad(y, y + bw); ctx.fill(); ctx.restore(); }
      }
      mono('10 ANS', MX, y + bw + 50, { alpha: E.out3(prog(lt, 2.0, 0.5)), color: C.beige });
      words('Selon les années d’admissibilité au crédit. Subventions versées jusqu’à la fin de l’année des *49~ans.*', MX, 1300, { size: 52, weight: 500, t0: 3.3, stagger: 0.04, lh: 1.2 }, lt);
    } },
    { d: 8, name: 'Pour qui', draw(lt) {
      kicker('POUR QUI', lt, 430);
      words('Peut être bénéficiaire :', MX, 590, { size: 84, t0: 0.15, stagger: 0.08 }, lt);
      checklist(['Admissible au crédit d’impôt pour personnes handicapées', 'Âgée de moins de 60 ans', 'Résidente du Canada, avec un numéro d’assurance sociale'], MX, 830, 210, lt, 0.9, 1.1, { size: 52 });
    } },
    { d: 8.8, name: 'Erreur fréquente', draw(lt) {
      kicker('ERREUR FRÉQUENTE', lt, 430);
      halo(MX + 90, 620, 120, prog(lt, 0.1, 0.8));
      icon('warning', MX + 90, 616, 150, prog(lt, 0.1, 0.9), { lw: 7 });
      words('Retirer *trop tôt.*', MX, 860, { size: 96, t0: 0.5, stagger: 0.1 }, lt);
      const q = E.out3(prog(lt, 1.4, 0.6)), r = E.out3(prog(lt, 2.2, 0.6));
      text('1 $', MX, 1040, { size: 110, weight: 800, color: C.text, alpha: q });
      mono('RETIRÉ', MX, 1100, { alpha: q, color: C.beige });
      hline(MX + 230, MX + 400, 1005, E.inOut3(prog(lt, 1.8, 0.5)), { lw: 4 });
      text('3 $', MX + 460, 1040, { size: 110, weight: 800, gold: true, glow: 30, alpha: r });
      mono('DE SUBVENTIONS ET BONS', MX + 460, 1100, { alpha: r, size: 26, ls: 2 });
      mono('À REMBOURSER', MX + 460, 1140, { alpha: r, size: 26, ls: 2 });
      card(MX - 20, 1200, CW + 40, 280, prog(lt, 3.0, 0.6));
      words('Jusqu’au total des subventions et bons reçus dans les *10~dernières~années.*', MX + 30, 1295, { size: 54, weight: 500, maxW: CW - 60, t0: 3.2, stagger: 0.045, lh: 1.2 }, lt);
    } },
    { d: 6, name: 'Fin', draw(lt) { endScene(lt); } }
  ]
};
