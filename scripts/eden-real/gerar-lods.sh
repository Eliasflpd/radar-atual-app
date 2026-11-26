set -e
cd /tmp/claude-0/t; O=ast; L="node pipe/lod.mjs"
# árvores: perto (até ~30 m) e médio (30–70 m); dali em diante, impostores
$L ph/island_tree_01_1k.gltf/island_tree_01_1k.gltf $O/arv1-perto.glb '{"folha":{"simp":0.25,"keep":0.3,"erro":0.05},"galho":{"simp":0.05,"erro":0.02},"tronco":{"simp":0.3,"erro":0.005},"tex":1024}'
$L ph/island_tree_01_1k.gltf/island_tree_01_1k.gltf $O/arv1-medio.glb '{"folha":{"simp":0.3,"keep":0.07,"erro":0.08},"galho":{"simp":0.012,"erro":0.05},"tronco":{"simp":0.08,"erro":0.02},"tex":512}'
$L ph/island_tree_02_1k.gltf/island_tree_02_1k.gltf $O/arv2-perto.glb '{"folha":{"simp":0.25,"keep":0.35,"erro":0.05},"galho":{"simp":0.05,"erro":0.02},"tronco":{"simp":0.3,"erro":0.005},"tex":1024}'
$L ph/island_tree_02_1k.gltf/island_tree_02_1k.gltf $O/arv2-medio.glb '{"folha":{"simp":0.3,"keep":0.09,"erro":0.08},"galho":{"simp":0.012,"erro":0.05},"tronco":{"simp":0.08,"erro":0.02},"tex":512}'
$L ph/island_tree_03_1k.gltf/island_tree_03_1k.gltf $O/arv3-perto.glb '{"folha":{"simp":0.25,"keep":0.18,"erro":0.05},"galho":{"simp":0.04,"erro":0.02},"tronco":{"simp":0.3,"erro":0.005},"tex":1024}'
$L ph/island_tree_03_1k.gltf/island_tree_03_1k.gltf $O/arv3-medio.glb '{"folha":{"simp":0.3,"keep":0.045,"erro":0.08},"galho":{"simp":0.01,"erro":0.05},"tronco":{"simp":0.08,"erro":0.02},"tex":512}'
$L ph/tree_small_02_1k.gltf/tree_small_02_1k.gltf $O/arv4-perto.glb '{"folha":{"simp":0.25,"keep":0.16,"erro":0.05},"galho":{"simp":0.2,"erro":0.02},"tronco":{"simp":0.3,"erro":0.005},"tex":1024}'
$L ph/tree_small_02_1k.gltf/tree_small_02_1k.gltf $O/arv4-medio.glb '{"folha":{"simp":0.3,"keep":0.04,"erro":0.08},"galho":{"simp":0.05,"erro":0.05},"tronco":{"simp":0.08,"erro":0.02},"tex":512}'
$L gtg/jacaranda_tree_1k.gltf/jacaranda_tree_1k.gltf $O/jac-perto.glb '{"folha":{"simp":0.25,"keep":0.35,"erro":0.05},"galho":{"simp":0.08,"erro":0.02},"tronco":{"simp":0.3,"erro":0.005},"tex":1024}'
$L gtg/jacaranda_tree_1k.gltf/jacaranda_tree_1k.gltf $O/jac-medio.glb '{"folha":{"simp":0.3,"keep":0.1,"erro":0.08},"galho":{"simp":0.02,"erro":0.05},"tronco":{"simp":0.08,"erro":0.02},"tex":512}'
# plantas e pedras (uma versão só; aparecem só perto)
P='"planta":true'
$L ph/fern_02_1k.gltf/fern_02_1k.gltf $O/samambaia.glb "{$P,\"folha\":{\"simp\":0.6,\"erro\":0.02},\"tex\":512}"
$L ph/searsia_lucida_1k.gltf/searsia_lucida_1k.gltf $O/arbusto1.glb '{"folha":{"simp":0.15,"keep":0.5,"erro":0.05},"tronco":{"simp":0.06,"erro":0.02},"tex":512}'
$L ph/wild_rooibos_bush_1k.gltf/wild_rooibos_bush_1k.gltf $O/arbusto2.glb '{"folha":{"simp":0.4,"erro":0.03},"tronco":{"simp":0.3,"erro":0.02},"tex":512}'
$L ph/pachira_aquatica_01_1k.gltf/pachira_aquatica_01_1k.gltf $O/folhagem1.glb "{\"folha\":{\"simp\":0.3,\"erro\":0.02},\"tronco\":{\"simp\":0.3,\"erro\":0.01},\"tex\":512}"
$L ph/calathea_orbifolia_01_1k.gltf/calathea_orbifolia_01_1k.gltf $O/folhagem2.glb "{$P,\"folha\":{\"simp\":0.4,\"erro\":0.02},\"tex\":512}"
$L ph/anthurium_botany_01_1k.gltf/anthurium_botany_01_1k.gltf $O/folhagem3.glb "{$P,\"folha\":{\"simp\":0.12,\"erro\":0.02},\"tex\":512}"
$L ph/flower_gazania_1k.gltf/flower_gazania_1k.gltf $O/flor1.glb "{$P,\"folha\":{\"simp\":0.4,\"erro\":0.02},\"tex\":512}"
$L ph/flower_heliophila_1k.gltf/flower_heliophila_1k.gltf $O/flor2.glb "{$P,\"folha\":{\"simp\":0.08,\"erro\":0.03},\"tex\":512}"
$L ph/periwinkle_plant_1k.gltf/periwinkle_plant_1k.gltf $O/flor3.glb "{$P,\"folha\":{\"simp\":0.15,\"erro\":0.03},\"tex\":512}"
$L ph/dandelion_01_1k.gltf/dandelion_01_1k.gltf $O/flor4.glb "{$P,\"folha\":{\"simp\":0.12,\"erro\":0.03},\"tex\":512}"
$L ph/shrub_03_1k.gltf/shrub_03_1k.gltf $O/mato1.glb "{$P,\"folha\":{\"simp\":0.5,\"erro\":0.02},\"tex\":512}"
$L ph/weed_plant_02_1k.gltf/weed_plant_02_1k.gltf $O/mato2.glb "{$P,\"folha\":{\"simp\":0.4,\"erro\":0.02},\"tex\":512}"
$L ph/nettle_plant_1k.gltf/nettle_plant_1k.gltf $O/mato3.glb "{$P,\"folha\":{\"simp\":0.2,\"erro\":0.03},\"tex\":512}"
$L gtg/grass_medium_01_1k.gltf/grass_medium_01_1k.gltf $O/capim1.glb "{$P,\"folha\":{\"simp\":0.3,\"erro\":0.03},\"tex\":512}"
$L gtg/grass_medium_02_1k.gltf/grass_medium_02_1k.gltf $O/capim2.glb "{$P,\"folha\":{\"simp\":0.3,\"erro\":0.03},\"tex\":512}"
$L ph/boulder_01_1k.gltf/boulder_01_1k.gltf $O/pedra1.glb '{"tronco":{"simp":0.05,"erro":0.005},"tex":1024}'
$L ph/rock_moss_set_02_1k.gltf/rock_moss_set_02_1k.gltf $O/pedra2.glb '{"tronco":{"simp":0.15,"erro":0.005},"tex":1024}'
$L ph/coast_rocks_01_1k.gltf/coast_rocks_01_1k.gltf $O/rochedo.glb '{"tronco":{"simp":0.04,"erro":0.003},"tex":1024}'
