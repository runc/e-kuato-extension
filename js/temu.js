$(document).ready(function () {

    let advanced_feat = true;
    if (!window.location.href.includes('temu.com')) {
        return;
    }

    let popup = $('<div id="custom-popup"></div>');

    let border_color = '#FD384F';
    if (window.location.href.includes('temu.com')) {
        border_color = '#FD384F';
    }

    popup.css({
        'position': 'fixed',
        'bottom': '0',
        'right': '0',
        'width': '350px',
        'height': 'auto',
        'padding': '5px',
        'background-color': '#fff',
        'border': '6px solid ' + border_color,
        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'z-index': '1000',
        'overflow': 'auto',
        'text-align': 'center',
        'line-height': '2'
    });

    let popupContent = $('<div></div>').css({
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        'height': '100%',
        'line-height': '2'
    });

    let selectTemplate = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;"><label>选择模板(可选)：</label><select id="dynamic-template" style="border: 1px solid;width:150px; font-weight: bold; font-size: 16px;padding:2px 6px"></select></div>');
    let identityInfo = $('<div style="margin-top:10px; font-size: 14px; color: #666; text-align: center;"><i class="fas fa-info-circle"></i> 身份设置请在插件弹窗中配置</div>');
    let hackBox = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;"><label>自动抓取(可选)：</label><input type="checkbox" id="auto-scrape" style="border: 1px solid;width:150px; font-weight: bold; font-size: 16px;padding:2px 6px"></div>');

    let c_url = window.location.href;

    const page_regex = /g-\d{10,15}\.html/;  // 商品详情正则  g-601099526475204.htm
    const shop_regex = /m-\d{10,15}\.html/;  // 店铺详情正则
    if (c_url.includes('.temu.com') && page_regex.test(c_url)) { //详情页面
        let buttonScrape = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;width:100%"><button id="dynamic-scrape" style="background-color: #18A058; color: white; padding: 5px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;">立即抓取</button><button id="dynamic-scrape" style="background-color: #CCCCCC; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;margin-top:10px" disabled>抓取店铺</button></div>');
        popupContent.append(selectTemplate, hackBox, identityInfo, buttonScrape);
    } else if (c_url.includes('.temu.com') && shop_regex.test(c_url) && advanced_feat) { // 店铺页面
        let scrapeDiv = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;width:100%;"><button id="dynamic-scrape" style="background-color: #C0C0C0; color: white; padding: 5px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;display:inline-block;" disabled>选择抓取(待完善)</button><button class="auto-scrape" style="background-color: #0F0E0C; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;margin-top:10px;">店内商品抓取</button><button class="auto-scrape" style="background-color: #FD384F; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;margin-top:10px;">推荐商品抓取</button></div>');
        popupContent.append(selectTemplate, hackBox, identityInfo, scrapeDiv);
    } else if (c_url.includes('temu.com') && (c_url.includes("-o3-") || c_url.includes("/search_result.html")) && advanced_feat) { // 类目|搜索页面
        let scrapeDiv = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;width:100%;"><button id="dynamic-scrape" style="background-color: #C0C0C0; color: white; padding: 5px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;display:inline-block;" disabled>选择抓取(待完善)</button><button class="auto-scrape" style="background-color: #F30037; color: white; padding: 5px 20px; border: none; cursor: pointer; border-radius: 5px;width:90%; font-weight: bold; font-size: 16px;margin-top:10px;">自动抓取商品</button></div>');
        popupContent.append(selectTemplate, hackBox, identityInfo, scrapeDiv);
    }

    popup.append(popupContent);
    $('body').append(popup);

    function get_template_list() {
        $.ajax({
            url: "http://127.0.0.1:8012/api/get_all_catalog",
            method: "GET",
            success: function (xhrData) {
                let options = xhrData.result || [];
                let selectElement = $('#dynamic-template');

                $.each(options, function (i, option) {
                    selectElement.append($('<option>', {
                        value: option.catalog,
                        text: option.catalog_title
                    }));
                });

                chrome.storage.sync.get(['template'], function (result) {
                    if (result.template) {
                        selectElement.val(result.template);
                    }
                });
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error: " + status + error);
            }
        });
    }

    // 获取模板列表
    get_template_list();

    let selectedHrefs = [];

    // 类目列表页面
    $('.dcl-carousel-element').on('mouseenter', function () {
        let button = $('<button style="position: relative; top: 0; left: 0; background-color: #18A058; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 5px;">选择</button>');
        $(this).find('.dcl-product-wrapper').prepend(button);
        button.on('click', function (event) {
            event.stopPropagation();
            if (!$(this).hasClass('selected')) {
                let item_href = $(this).closest('.dcl-carousel-element').find('a.dcl-product-link').attr('href');
                $(this).closest('.dcl-carousel-element').addClass('selected').css('border', '4px solid green');
                selectedHrefs.push(item_href);
            } else {
                $(this).closest('.dcl-carousel-element').removeClass('selected').css('border', '');
                let item_href = $(this).closest('.dcl-carousel-element').find('a.dcl-product-link').attr('href');
                selectedHrefs = selectedHrefs.filter(href => href !== item_href);
            }
            // 判断select-mode是否选中，如果选中，则显示批量抓取按钮
            $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
        });
    })
        .on('mouseleave', function () {
            $(this).find('button').remove();
        });

    // 搜索列表页面

    $('.js-search-goodsList .autoFitList > div').on('mouseenter', function () {
        let button = $('<button style="position: relative; top: 0; left: 0; background-color: #18A058; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 5px;">选择</button>');
        $(this).prepend(button);
        let $goods_item_div = $(this);
        button.on('click', function (event) {
            event.stopPropagation();
            if (button.text() == '选择') {
                button.text('取消');
            } else {
                button.text('选择');
            }
            if (!$goods_item_div.hasClass('selected')) {
                let item_href = $goods_item_div.find('a').attr('href');
                $goods_item_div.addClass('selected').css('border', '4px solid green');
                selectedHrefs.push(item_href);
            } else {
                $goods_item_div.removeClass('selected').css('border', '');
                let item_href = $goods_item_div.find('a').attr('href');
                selectedHrefs = selectedHrefs.filter(href => href !== item_href);
            }
            // 判断select-mode是否选中，如果选中，则显示批量抓取按钮
            $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
        });
    }).on('mouseleave', function () {
        $(this).find('button').remove();
    });

    $('#dynamic-template').change(function () {
        let selectedTemplate = $(this).val();
        if (selectedTemplate) {
            chrome.storage.sync.set({ 'template': selectedTemplate }, function () {
                console.log('Template saved: ' + selectedTemplate);
            });
        }
    });



    $('#auto-scrape').change(function () {
        let isAutoScrape = $(this).is(':checked');
        chrome.storage.sync.set({ 'autoScrape': isAutoScrape }, function () {
            console.log('Auto Scrape saved: ' + isAutoScrape);
        });
    });

    chrome.storage.sync.get(['autoScrape'], function (result) {
        if (result.autoScrape !== undefined) {
            $('#auto-scrape').prop('checked', result.autoScrape);
        }
    });



    // 列表页面自动翻页
    if (window.location.href.includes('aliexpress.com/w') && window.location.href.includes('open_mode=auto')) {
        do_scrape('auto');
    }

    // 前端自动点击店铺商品
    function auto_click_shop_v2() {
        let click_index = 0;
        $('div[class*="js-goods-list"] > div > div').each(function (index, ele) {
            let href = $(this).find('a').attr('href');
            if (page_regex.test(href)) {
                click_index++;
                if (href && !href.includes('open_mode=auto')) {
                    href += '?open_mode=auto';
                    $(this).find('a').attr('href', href);
                }
                setTimeout(() => {
                    $(this).children().click();
                }, click_index * 8 * 1000);
                return;
            }
        })
    }

    // 搜索页面抓取
    function auto_scrape_list_v2() {
        let click_index = 1;
        $('div[class*="js-search-goodsList"]').each(function () {
            $(this).find('div[class*="autoFitList"] > div').each(function () {
                let item_href = $(this).find('a').attr('href');
                if (page_regex.test(item_href)) {
                    click_index++;
                    chrome.storage.sync.get(['scrapedHrefs'], function (result) {
                        let scrapedHrefs = result.scrapedHrefs || [];
                        if (!scrapedHrefs.includes(item_href)) {
                            scrapedHrefs.push(item_href);
                            chrome.storage.sync.set({ 'scrapedHrefs': scrapedHrefs }, function () {
                                console.log('Added href to storage: ' + item_href);
                            });
                        }
                    });
                    setTimeout(() => {
                        $(this).children().click();
                    }, 1000 * 10 * click_index);
                }
            })
        })
    }

    // 全店抓取
    function auto_scrap_shop_v2(is_inner) {
        // 获取当前店铺商品
        $('div[class*="mainContent"]').each(function () {
            let firstLevelDivs = $(this).children('div');
            let is_inner_shop = false;
            let is_top_picks = false;
            firstLevelDivs.each(function () {
                let divText = $(this).text();
                if (divText.includes("itemsSort") && is_inner) { // 店铺内商品
                    is_inner_shop = true;
                    return;
                } else if (divText.includes("Top picks for you")) { // 推荐商品
                    is_top_picks = true;
                    return;
                }
            });
            if (is_inner_shop) {
                let click_index = 1;
                let shop_inner_urls = [];
                $(this).find('div[class*="js-goods-list"] > div > div').each(function () {
                    let href = $(this).find('a').attr('href');
                    if (page_regex.test(href)) {
                        click_index++;
                        shop_inner_urls.push(href);
                        setTimeout(() => {
                            $(this).children().click();
                        }, click_index * 8 * 1000);
                    }
                })
                console.log("shop_inner_urls店铺内商品数量:================", shop_inner_urls.length);
                return;
            }
            //  else if (is_top_picks) {
            //     let click_index = 0;
            //     $(this).find('div[class*="js-goods-list"] > div > div').each(function () {
            //         let href = $(this).find('a').attr('href');
            //         if (page_regex.test(href)) {
            //             click_index++;
            //             if (href && !href.includes('open_mode=auto')) {
            //                 href += '?open_mode=auto';
            //                 $(this).find('a').attr('href', href);
            //             }
            //             setTimeout(() => {
            //                 $(this).children().click();
            //             }, click_index * 8 * 1000);
            //             return;
            //         }
            //     })
            // }
        });

        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                $('div[aria-label="See more"]').children().click();
                // $('div[aria-label="See more"]').each(function () {
                //     console.log("全店抓取click see more1.0================", $(this).attr('class'));
                // });
            }, i * 5 * 1000);
        }

    }

    // 自动抓取每一页的商品
    function auto_scrape_list() {
        // 滚动到页面最底部
        let scrollHeight = document.body.scrollHeight * 3;
        let currentPosition = 0;
        let scrollStep = 200;
        let scrollInterval = setInterval(function () {
            if (currentPosition < scrollHeight) {
                currentPosition += scrollStep;
                window.scrollTo(0, currentPosition);
            } else {
                clearInterval(scrollInterval);
                let item_links = $('div[class*="s-product-image-container"]').find('a');
                if (item_links.length > 0) {
                    item_links.each(function (index, ele) {
                        let href = $(ele).attr('href');
                        if (href) {
                            let autoUrl = href + '&open_mode=auto';
                            setTimeout(() => {
                                window.open(autoUrl, '_blank');
                            }, index * 10000);
                        }
                    });
                }
            }
        }, 150);
    }

    // 执行手动选择并批量抓取
    function batch_selected_scrape() {
        if (selectedHrefs.length == 0) {
            alert('请选择商品.');
            return;
        }
        selectedHrefs.forEach((href, index) => {
            let autoUrl = href + '&open_mode=auto';
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, index * 10000);
        });
        // 清空
        selectedHrefs = [];
        // 批量抓取按钮内容重置
        $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
    }

    function get_size_text($this, text_flag) {
        var targetDiv = $this.find("div:contains('" + text_flag + "')");
        var siblingDivs = targetDiv.siblings("div");
        var resultArray = [];
        siblingDivs.each(function (index, ele) {
            var childDivs = $(ele).find("div");
            childDivs.each(function (childIndex, childElement) {
                var measure_text = $(childElement).text();
                if (!measure_text.includes("use strict") && measure_text.trim() != '') {
                    resultArray.push(measure_text);
                }
            });
        });
        if (resultArray.length > 0) {
            resultArray.shift();
        }
        return resultArray;
    }

    // 获取尺码表
    function get_size_chart($j_table1, $j_table2, send_json) {
        // 参考: https://www.temu.com/--surplice------a--knee-length--for--summer-womens--g-601099602730965.html?top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F4f1898ed-58a0-4725-ad5e-4ef66426bc88.jpg&spec_id=73400184&spec_gallery_id=6204&refer_page_sn=10032&refer_source=0&freesia_scene=2&_oak_freesia_scene=2&_oak_rec_ext_1=MTgzMw&_oak_gallery_order=660131294%2C661751482%2C1062633670%2C1753985010%2C783421273&_oak_mp_inf=ENW%2FrsKm1ogBGiBiM2E0MGY5OGNhZjA0OGRhODQ4NTE5YzY2NTYwYjRmOCDu%2B9f0pzI%3D&spec_ids=73400184%2C81963663&search_key=women%20dresses%20for%20church&refer_page_el_sn=200049&refer_page_name=goods&refer_page_id=10032_1728714204074_h3khb8j2w6&_x_sessn_id=xbmb40wun4
        let size_chart_data = {};
        let table_data_1 = [];
        let table_data_2 = [];
        $j_table1.find('thead tr').each(function () {
            let row = [];
            $(this).find('th').each(function () {
                row.push($(this).text());
            });
            size_chart_data['table_title_1'] = row;
        });
        $j_table1.find('tbody tr').each(function () {
            let row = [];
            $(this).find('td').each(function () {
                row.push($(this).text());
            });
            table_data_1.push(row);
        });
        size_chart_data['table_rows_1'] = table_data_1;

        if ($j_table2) {
            $j_table2.find('thead tr').each(function () {
                let row = [];
                $(this).find('th').each(function () {
                    row.push($(this).text());
                });
                size_chart_data['table_title_2'] = row;
            });
            $j_table2.find('tbody tr').each(function () {
                let row = [];
                $(this).find('td').each(function () {
                    row.push($(this).text());
                });
                table_data_2.push(row);
            });
            size_chart_data['table_rows_2'] = table_data_2;
        }

        $('span:contains("How to measure body")').click();
        setTimeout(() => {
            let body_measure = [];
            $('div[role="dialog"]').each(function () {
                let dialog_text = $(this).text();
                if (dialog_text.includes("How to measure body") && !dialog_text.includes("Size guide")) {
                    let body_image_arr = [];
                    $(this).find('img').each(function () {
                        let img_src = $(this).attr('src');
                        body_image_arr.push(img_src);
                    });
                    size_chart_data['body_image'] = body_image_arr;
                    body_measure = get_size_text($(this), "How to measure body");
                }
            });
            size_chart_data['body_measure'] = body_measure;
            $('span:contains("How to measure product")').click();
            setTimeout(() => {
                let product_measure = [];
                $('div[role="dialog"]').each(function () {
                    let dialog_text = $(this).text();
                    if (dialog_text.includes("How to measure product")) {
                        let product_image_arr = [];
                        $(this).find('img').each(function () {
                            let img_src = $(this).attr('src');
                            product_image_arr.push(img_src);
                        });
                        size_chart_data['product_image'] = product_image_arr;
                        product_measure = get_size_text($(this), "How to measure product");
                    }
                });
                size_chart_data['product_measure'] = product_measure;
                send_json['product_info']['size_chart'] = size_chart_data;
                save_scrape_data(send_json);
                setTimeout(() => {
                    window.close();
                }, 2000);
            }, 1000 * 3);
        }, 1000 * 3);
        return size_chart_data;
    }

    // 保存抓取数据
    function save_scrape_data(send_json) {
        fetch('http://127.0.0.1:8012/save_init_product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(send_json)
        }).then(response => response.json())
            .then(data => {
                // 判断如果当前url包含open_mode=auto，则不弹出抓取成功
                if (!window.location.href.includes('open_mode=auto')) {
                    // alert("抓取成功");
                    console.log("抓取成功")
                }
            })
            .catch(error => {
                if (!window.location.href.includes('open_mode=auto')) {
                    // alert("抓取失败");
                    console.log("抓取失败")
                }
            });
    }


    // 执行具体抓取
    function do_scrape() {
        let selectedTemplate = $('#dynamic-template').val();

        // 从chrome.storage中获取身份设置
        chrome.storage.sync.get(['scrapeKey'], function (result) {
            let selectedIdentity = result.scrapeKey;

            if (!selectedIdentity) {
                alert('请在插件弹窗中设置身份标识');
                return;
            }

            performScrape(selectedTemplate, selectedIdentity);
        });
    }

    // 执行实际的抓取操作
    function performScrape(selectedTemplate, selectedIdentity) {

        let product_info = {};

        let product_title = $("#rightContent > div").eq(1).text()
        // 获取售价
        // let price_doc = $("#goods_price > div").eq(0);
        // let sell_price_text = price_doc.text();
        // // 剔除sell_price_text中美元符号或者人民币符号以及空格字符
        // let sell_price = sell_price_text.replace('$', '').replace('￥', '').replace(' ', '');
        // if (sell_price.includes('$')) {
        //     sell_price = sell_price.split('$')[1];
        // }

        product_info['product_title'] = product_title.trim();
        // product_info['sell_price'] = sell_price;
        // product_info['origin_price'] = sell_price;

        // 获取尺码
        // let sizeOptions = [];
        // $("div[class*='shaking']").each(function () {
        //     $(this).find('div[aria-label]').each(function () {
        //         sizeOptions.push($(this).attr('aria-label'));
        //     });
        // });
        // product_info['size_props'] = sizeOptions;

        // 获取颜色
        let colorOptions = {};

        // 获取颜色以及图片
        $('script').each(function () {
            let scriptContent = $(this).html();
            if (scriptContent.includes(`__CHUNK_DATA__`)) {
                let start_split = `window.__CHUNK_DATA__={};window.rawData=`;
                let end_split = `;document.dispatchEvent(new Event('XRenderInitialPropsLoaded'));`;
                let colorJsonTxt = scriptContent.substring(scriptContent.indexOf(start_split) + start_split.length, scriptContent.indexOf(end_split));
                let colorJson = JSON.parse(colorJsonTxt);
                let color_skus = colorJson.store.goods.skc;
                let colorImagesArr = [];
                color_skus.forEach(function (color_sku) {
                    let color_name = color_sku.specValue;
                    let color_image_arr = color_sku.gallery;
                    let color_item = { color_name: color_name };
                    let other_images = [];
                    color_image_arr.forEach(function (image_item) {
                        other_images.push(image_item.url);
                    });
                    let main_image_url = '';
                    if (other_images.length > 0) {
                        color_image = other_images[0];
                        color_item['main_image'] = color_image;
                        other_images.shift();
                    }
                    colorOptions[color_name] = main_image_url;
                    color_item['other_images'] = other_images;
                    colorImagesArr.push(color_item);
                });
                product_info['color_images'] = colorImagesArr;

                // 获取价格
                let sell_price_text = colorJson.store.goods.minToMaxPriceStr
                if (sell_price_text) {
                    let sell_price = sell_price_text.replace('$', '').replace('￥', '').replace(' ', '');
                    if (sell_price.includes('$')) {
                        sell_price = sell_price.split('$')[1];
                    }
                    product_info['sell_price'] = sell_price;
                    product_info['origin_price'] = sell_price;
                }

                // 获取颜色
                if (Object.keys(colorOptions).length > 0) {
                    product_info['color_props'] = colorOptions;
                } else {
                    product_info['color_props'] = { 'oneColor': '' };
                }

                // 获取尺码
                let skuTypeValues = colorJson.store.formatSkuData.skuTypeValues;
                if (skuTypeValues && skuTypeValues.length > 0) {
                    skuTypeValues.forEach(function (skuTypeValue) {
                        let type = skuTypeValue.type;
                        if (type == 'Size') {
                            product_info['size_props'] = skuTypeValue.values;
                        }
                    });
                }

                // 商品属性规格
                let product_specs = colorJson.store.goods.goodsProperty;
                let product_specifications = [];
                if (product_specs.length > 0) {
                    product_specs.forEach(function (product_spec) {
                        let title = product_spec.key;
                        if (title.includes('Item ID')) {
                            return;
                        }
                        let value = product_spec.values;
                        if (value && value.length > 0) {
                            if (value.length > 0) {
                                value = value.join(',');
                            }
                            product_specifications.push({
                                title: title,
                                value: value
                            });
                        }
                    });
                }
                product_info['spec_props'] = product_specifications;
                return;
            }
        });

        let send_json = {
            'template': selectedTemplate,
            'scrapeKey': selectedIdentity,
            'item_url': window.location.href,
            'product_info': product_info
        };

        // 商品描述
        let product_descs = [];
        product_info['product_desc'] = product_descs;

        $('div:contains("Size guide")').click();
        setTimeout(() => {
            $('div[role="dialog"]').each(function () {
                let dialog_text = $(this).text();
                if (dialog_text.includes("Size guide")) {
                    let $size_tables = $(this).find('table');
                    let $jtable_1 = $size_tables.eq(0);
                    let $jtable_2 = $size_tables.eq(1);
                    get_size_chart($jtable_1, $jtable_2, send_json);
                }
            });

        }, 1000 * 5);

    }

    // performScrape函数结束

    // 手动执行抓取操作以及批量操作
    $('#dynamic-scrape').click(function () {
        let c_url = window.location.href;
        // 定义正则表达式，匹配 - 后面跟着 15 个数字，然后是 .html
        // 使用正则表达式测试输入字符串
        if (page_regex.test(c_url)) {  // 商品详情页面抓取
            do_scrape();  // 商品详情页面，手动抓取单个商品
        } else {
            batch_selected_scrape();
        }
    });


    // 自动抓取 | 全店抓取，点击自动抓取按钮
    $('.auto-scrape').click(function () {
        // auto_scrape_page();
        let btn_text = $(this).text();
        let inner = false;
        let scrape_list = false;
        if (btn_text.includes("店内商品抓取")) {
            inner = true;
        } else if (btn_text.includes("自动抓取商品")) {
            scrape_list = true;
        }
        let c_url = window.location.href;
        let shop_regex = /m-\d{10,15}\.html/;
        if (c_url.includes('temu.com') && shop_regex.test(c_url)) {
            auto_scrap_shop_v2(inner);
        } else if (scrape_list) {
            auto_scrape_list_v2();
        }
    });

    // 自动抓取temu情页面数据，并再延迟10s，直接执行抓取动作
    chrome.storage.sync.get(['autoScrape'], function (result) {
        let auto_scrape_enable = result.autoScrape;
        if (page_regex.test(c_url) && window.location.href.includes('temu.com') && auto_scrape_enable) {
            setTimeout(function () {
                do_scrape();
                setTimeout(function () {
                    window.close();
                }, 15 * 1000);
            }, 5 * 1000);  // 这个延迟，是给页面加载数据的时间
        }
    });


    // 自动抓取列表页面数据
    if (window.location.href.includes('temu.com/s') && window.location.href.includes('open_mode=auto')) {
        setTimeout(function () {
            auto_scrape_list();
            setTimeout(function () {
                window.close();
            }, 10000 * 6 * 10);
        }, 10000);
    }

});
