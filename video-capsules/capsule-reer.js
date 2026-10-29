/* Capsule 3 — REER. Sources des chiffres : voir scripts.md */
VIDEOS.reer = {
  label: 'CAPSULE · REER',
  scenes: [
    { d: 4, name: 'Accroche', draw(lt) {
      kicker('IDÉE REÇUE', lt, 560);
      const g = words('« Le REER fait disparaître l’impôt. »', MX, 720, { size: 100, t0: 0.15, stagger: 0.08 }, lt);
      strike(g, lt, 2.1);
      stamp('Il le reporte.', W / 2, 1270, 150, lt, 2.4);
    } },
    { d: 8, name: 'Ce que c’est', draw(lt) {
      kicker('CE QUE C’EST', lt, 430);
      acronym(['R', 'E', 'E', 'R'], ['Régime', 'enregistré', 'd’épargne', 'retraite'], 680, lt, 0.1);
      words('Un régime pour la retraite : l’argent y est *à~l’abri de~l’impôt* tant qu’il y reste.', MX, 960, { size: 74, t0: 2.0, stagger: 0.065 }, lt);
      const p = prog(lt, 3.6, 1.3);
      halo(W / 2, 1440, 170, p);
      icon('hourglass', W / 2, 1440, 170, p, { lw: 7 });
    } },
    { d: 8.2, name: 'Mécanisme 1', draw(lt) {
      kicker('MÉCANISME 1 · LA DÉDUCTION', lt, 430);
      words('Vos cotisations *réduisent* votre revenu imposable.', MX, 580, { size: 76, t0: 0.15, stagger: 0.07 }, lt);
      const y = 890, h = 110, full = CW, part = CW * 5000 / 60000;
      const p = E.inOut3(prog(lt, 1.6, 0.9));
      if (p > 0) {
        ctx.save(); rrect(MX, y, full * p, h, 16); ctx.fillStyle = 'rgba(198,172,143,0.30)'; ctx.fill(); ctx.restore();
      }
      mono('REVENU', MX, y - 24, { alpha: E.out3(prog(lt, 1.6, 0.5)), color: C.beige });
      text('60 000 $', MX + 30, y + 74, { size: 56, weight: 800, color: C.text, alpha: E.out3(prog(lt, 2.0, 0.5)) });
      // cotisation qui se détache
      const c = E.inOut3(prog(lt, 3.0, 0.9));
      if (c > 0) {
        ctx.save(); ctx.globalAlpha *= c;
        rrect(MX + full - part, y + 115 * c, part, h, 16); ctx.fillStyle = goldGrad(y, y + h + 115); ctx.fill(); ctx.restore();
        mono('COTISATION 5 000 $', MX + full, y + h + 115 * c + 50, { align: 'right', alpha: c });
      }
      // revenu imposable
      const r = E.out3(prog(lt, 4.0, 0.8));
      const y2 = 1330;
      mono('REVENU IMPOSABLE', MX, y2 - 24, { alpha: r, color: C.beige });
      if (r > 0) { ctx.save(); ctx.globalAlpha *= r; rrect(MX, y2, (full - part) * r, h, 16); ctx.fillStyle = goldGrad(y2, y2 + h); ctx.fill(); ctx.restore(); }
      if (lt > 4.0) text(fmt(60000 - 5000 * r) + ' $', MX + 30, y2 + 74, { size: 56, weight: 800, color: C.bg0 });
      words('Exemple : revenu de 60 000 $, cotisation de 5 000 $.', MX, 1530, { size: 46, weight: 500, color: C.beige, t0: 4.6, stagger: 0.04 }, lt);
    } },
    { d: 8.8, name: 'Mécanisme 2', draw(lt) {
      kicker('MÉCANISME 2 · LE PLAFOND', lt, 430);
      const a = E.out5(prog(lt, 0.2, 1.3));
      if (lt > 0.2) big(Math.round(18 * a) + ' %', MX - 8, 740, 250);
      words('de votre revenu gagné l’année précédente (par exemple : salaire, revenu d’entreprise)', MX, 840, { size: 50, weight: 500, color: C.beige, t0: 0.9, stagger: 0.04, lh: 1.2 }, lt);
      hline(MX, MX + CW, 1010, E.inOut3(prog(lt, 2.6, 0.7)), { alpha: 0.4, lw: 2 });
      words('jusqu’à un maximum de', MX, 1090, { size: 50, weight: 500, t0: 2.8, stagger: 0.05 }, lt);
      const b = E.out5(prog(lt, 3.2, 1.4));
      if (lt > 3.2) big(fmt(33810 * b) + ' $', MX - 6, 1250, 170);
      mono('PLAFOND 2026', MX, 1320, { alpha: E.out3(prog(lt, 3.8, 0.5)) });
      words('Droits inutilisés : *reportés* aux années suivantes.', MX, 1450, { size: 54, weight: 500, t0: 4.6, stagger: 0.05 }, lt);
    } },
    { d: 8.4, name: 'Mécanisme 3', draw(lt) {
      kicker('MÉCANISME 3 · LE RETRAIT', lt, 430);
      words('Au retrait, l’argent devient *imposable.*', MX, 590, { size: 80, t0: 0.15, stagger: 0.07 }, lt);
      const y = 940, x1 = MX + 150, x2 = MX + CW - 150;
      const p = E.inOut3(prog(lt, 1.4, 1.2));
      hline(x1, x2, y, p, { lw: 4, alpha: 0.7 });
      [[x1, 'AUJOURD’HUI', 'Déduction', 1.2], [x2, 'RETRAITE', 'Imposé', 2.4]].forEach(([x, lab, val, t0]) => {
        const q = E.outBack(prog(lt, t0, 0.5));
        if (q > 0) {
          ctx.save(); ctx.beginPath(); ctx.arc(x, y, 26 * q, 0, Math.PI * 2); ctx.fillStyle = goldGrad(y - 26, y + 26); ctx.fill(); ctx.restore();
          mono(lab, x, y - 60, { align: 'center', alpha: clamp(q), color: C.beige });
          text(val, x, y + 100, { size: 60, weight: 800, align: 'center', gold: true, alpha: clamp(q) });
        }
      });
      words('L’avantage est plus grand si votre revenu est *plus bas au retrait* qu’au moment de cotiser.', MX, 1230, { size: 60, weight: 500, t0: 2.9, stagger: 0.045 }, lt);
    } },
    { d: 7.4, name: 'Pour qui', draw(lt) {
      kicker('POUR QUI', lt, 430);
      words('Surtout utile si vous avez :', MX, 590, { size: 84, t0: 0.15, stagger: 0.08 }, lt);
      checklist(['Un revenu d’emploi ou d’entreprise', 'Un taux d’imposition élevé aujourd’hui', 'Un horizon d’épargne à long terme'], MX, 860, 170, lt, 1.0, 0.8, { size: 56 });
    } },
    { d: 8.4, name: 'Erreur fréquente', draw(lt) {
      kicker('ERREUR FRÉQUENTE', lt, 430);
      halo(MX + 90, 620, 120, prog(lt, 0.1, 0.8));
      icon('warning', MX + 90, 616, 150, prog(lt, 0.1, 0.9), { lw: 7 });
      words('Puiser dans son REER *avant la retraite.*', MX, 860, { size: 88, t0: 0.5, stagger: 0.08 }, lt);
      card(MX - 20, 1170, CW + 40, 330, prog(lt, 2.4, 0.6));
      words('Le retrait s’ajoute à vos *revenus de l’année,* et de l’impôt est retenu à la source.', MX + 30, 1270, { size: 58, weight: 500, maxW: CW - 60, t0: 2.7, stagger: 0.045 }, lt);
    } },
    { d: 6.2, name: 'Fin', draw(lt) { endScene(lt); } }
  ]
};
