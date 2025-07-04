$(document).ready(function () {

    let advanced_feat = true;

    if (!window.location.href.includes('amazon.com')) {
        return;
    }

    let popup = $('<div id="custom-popup"></div>');

    let border_color = '#FD384F';
    if (window.location.href.includes('amazon.com')) {
        border_color = '#FD384F';
    }

    popup.css({
        'position': 'fixed',
        'bottom': '0',
        'right': '0',
        'width': '300px',
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

    let selectTemplate = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;"><label>选择模板(可选)：</label><select id="dynamic-template" style="border: 1px solid;width:150px;height:2rem; font-weight: bold; font-size: 16px;padding:2px 6px"></select></div>');
    let identityInfo = $('<div style="margin-top:10px; font-size: 14px; color: #666; text-align: center;"><i class="fas fa-info-circle"></i> 身份设置请在插件弹窗中配置</div>');
    let c_url = window.location.href;
    let clearPopup = false;
    if (c_url.includes('.amazon.com') && !c_url.includes('.amazon.com/s') && !c_url.includes('/b/')) { // 亚马逊商品详情页面
        let buttonScrape = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;"><button id="dynamic-scrape" style="background-color: #18A058; color: white; padding: 8px 20px; border: none; cursor: pointer; border-radius: 5px;width:250px; font-weight: bold; font-size: 16px;">立即抓取</button><button id="dynamic-scrape" style="background-color: #C1C1C1; color: white; padding: 8px 20px; border: none; cursor: pointer; border-radius: 5px;width:250px; font-weight: bold; font-size: 16px;margin-top:10px;" disabled>抓取店铺</button></div>');
        popupContent.append(selectTemplate, identityInfo, buttonScrape);
        clearPopup = true;
    } else if ((c_url.includes('.amazon.com/s') || c_url.includes('/b/')) && advanced_feat) { // 亚马逊列表页面
        let scrapeDiv = $('<div style="margin-top:10px; font-weight:bold; font-size: 16px;display:inline-block;width:95%;"><button id="dynamic-scrape" style="background-color: #18A058; color: white; padding: 8px 20px; border: none; cursor: pointer; border-radius: 5px;width:120px; font-weight: bold; font-size: 16px;display:inline-block;">批量抓取</button><button id="auto-scrape" style="background-color: #FD384F; color: white; padding: 8px 20px; border: none; cursor: pointer; border-radius: 5px;width:120px; font-weight: bold; font-size: 16px;display:inline-block;margin-left:5px;">自动抓取</button></div><div style="width:95%;"><button id="background-scrape" style="background-color: #FEBD69; color: white; padding: 8px 20px; border: none; cursor: pointer; border-radius: 5px;width:94%; font-weight: bold; font-size: 16px;display:inline-block;margin-top:10px;">后台抓取</button></div>');
        popupContent.append(selectTemplate, identityInfo, scrapeDiv);
    }

    if (advanced_feat || clearPopup) {
        popup.append(popupContent);
        $('body').append(popup);
    }

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
        if (!advanced_feat) {
            return;
        }
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
    $('.s-result-item').on('mouseenter', function () {
        if (!advanced_feat) {
            return;
        }
        let button = $('<button style="position: relative; top: 0; left: 0; background-color: #18A058; color: white; padding: 5px 10px; border: none; cursor: pointer; border-radius: 5px;">选择</button>');
        $(this).prepend(button);
        button.on('click', function (event) {
            event.stopPropagation();
            if (!$(this).hasClass('selected')) {
                let item_href = $(this).closest('.s-result-item').find('a').attr('href');
                $(this).closest('.s-result-item').addClass('selected').css('border', '4px solid green');
                selectedHrefs.push(item_href);
            } else {
                $(this).closest('.s-result-item').removeClass('selected').css('border', '');
                let item_href = $(this).closest('.s-result-item').find('a').attr('href');
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



    // 列表页面自动翻页
    if (window.location.href.includes('aliexpress.com/w') && window.location.href.includes('open_mode=auto')) {
        do_scrape('auto');
    }

    // 获取所有分页urls并依次打开
    function auto_scrape_page() {

        let pageNumText = ''
        let pageNum = 1
        $("div.s-pagination-container").find(".s-pagination-item").each(function () {
            let text = $(this).text();
            if (text.includes('Next')) { // 下一页
                if (pageNumText) {
                    pageNum = parseInt(pageNumText);
                }
            }
            pageNumText = text.replace('Next', '').replace('Previous', '').trim();
        });

        for (let i = 1; i <= pageNum; i++) {
            let urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', i);
            urlParams.set('ref', `sr_pg_${i - 1}`);
            urlParams.set('open_mode', 'auto');
            let autoUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
            setTimeout(() => {
                window.open(autoUrl, '_blank');
            }, i * 10 * 1000);
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
                // let item_links = $('div[class*="s-product-image-container"]').find('a');
                let item_links = $('div[data-component-type="s-search-result"]').find('a');
                let clean_hrefs = [];
                let autoUrls = [];
                if (item_links.length > 0) {
                    item_links.each(function (index, ele) {
                        let href = $(ele).attr('href');
                        let cleanHref = href.split('ref=')[0]
                        if (cleanHref && !clean_hrefs.includes(cleanHref) && cleanHref.includes('/dp/')) {
                            clean_hrefs.push(cleanHref);
                            let autoUrl = href + '&open_mode=auto';
                            autoUrls.push(autoUrl);
                        }
                        clean_hrefs.push(cleanHref);
                    });
                }
                autoUrls.forEach((autoUrl, index) => {
                    setTimeout(() => {
                        window.open(autoUrl, '_blank');
                    }, index * 5 * 1000);
                });

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
            }, index * 10 * 1000);
        });
        // 清空
        selectedHrefs = [];
        // 批量抓取按钮内容重置
        $('#dynamic-scrape').text('批量抓取(' + selectedHrefs.length + ')');
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

        // 获取品牌 Visit the VICHYIE Store
        let brand_text = $('#bylineInfo').text();
        let brand_name = '';
        if (brand_text && brand_text.includes('Visit the')) {
            const regex = /Visit the (.*?) Store/;
            const matched = brand_text.match(regex);
            if (matched) {
                brand_name = matched[1];
            }
        }
        // 提取： Brand: SaoBiiu
        if (brand_text && !brand_name) {
            brand_name = brand_text.replace('Brand: ', '').trim();
        }

        // 获取售价
        var apexPriceToPay = $(".apexPriceToPay");
        var sell_price_text = apexPriceToPay.find(".a-offscreen").text();
        if (!sell_price_text) {
            sell_price_text = sell_price_text.replace(/\s+/g, '');
        }
        if (!sell_price_text) {
            sell_price_text = $('#corePriceDisplay_desktop_feature_div').find('.aok-offscreen').text();
        }
        if (!sell_price_text) {
            return;
        }
        // 剔除sell_price_text中美��符号或者人民币符号以及空格字符
        // 有些情况，价格是一个区间，比如:https://www.amazon.com/VICHYIE-Dresses-Summer-Ribbed-Sleeve/dp/B0CSYMYZNC/ref=sr_1_66?th=1
        let sell_price = sell_price_text.replace('$', '').replace('￥', '').replace(' ', '');
        if (sell_price.includes('$')) {
            sell_price = sell_price.split('$')[1];
        }

        let product_title_text = $('#productTitle').text();
        let product_title = product_title_text.replace(brand_name, '').trim();
        product_info['product_title'] = product_title.trim();
        product_info['sell_price'] = sell_price;
        product_info['origin_price'] = sell_price;

        // 获取尺码
        let sizeOptions = [];
        $("#native_dropdown_selected_size_name option").each(function () {
            let size_val = $(this).val();
            if (size_val && size_val != '-1') {
                sizeOptions.push($(this).text());
            }
        });
        if (sizeOptions.length > 0) {
            product_info['size_props'] = sizeOptions;
        } else {
            product_info['size_props'] = ['One Size']
        }

        // 获取颜色
        var liElements = $('#variation_color_name').find('img');
        let colorOptions = {};
        liElements.each(function () {
            let color_name = $(this).attr('alt');
            let color_image = $(this).attr('src');
            colorOptions[color_name] = color_image;
        });
        if (Object.keys(colorOptions).length > 0) {
            product_info['color_props'] = colorOptions;
        } else {
            let color_name = $("#variation_color_name .selection").text();
            if (color_name) {
                product_info['color_props'] = { [color_name]: '' };
            } else {
                product_info['color_props'] = { 'oneColor': [color_name] };
            }
        }

        // 获取颜色以及图片
        $('script').each(function () {
            let scriptContent = $(this).html();
            let start_split = `var obj = jQuery.parseJSON(`;
            let end_split = `');
data["alwaysIncludeVideo"] = obj.alwaysIncludeVideo`;
            if (scriptContent.includes(`var obj = jQuery.parseJSON('{"dataInJson":null,"alwaysIncludeVideo":true,"autoplayVideo":false,"defaultColor":"initial"`)) {
                let colorJsonTxt = scriptContent.substring(scriptContent.indexOf(start_split) + start_split.length + 1, scriptContent.indexOf(end_split));
                let colorJson = {};
                try {
                    colorJson = jQuery.parseJSON(colorJsonTxt);
                } catch (e) {
                    colorJsonTxt = colorJsonTxt.replace(/\\/g, '\\\\')
                    colorJson = jQuery.parseJSON(colorJsonTxt);
                }

                let colorImages = colorJson.colorImages;
                // 遍历colorImages,colorImages是一个json对象
                let colorImagesArr = [];
                for (let key in colorImages) {
                    let color_name = key;
                    let color_image_arr = colorImages[key];
                    let color_item = { color_name: color_name };
                    let other_images = [];
                    color_image_arr.forEach(function (image_item) {
                        let variant = image_item.variant;
                        if (variant == 'MAIN') { // 主图
                            color_item['main_image'] = image_item.hiRes;
                        } else { // 其他图
                            other_images.push(image_item.hiRes);
                        }
                    });
                    color_item['other_images'] = other_images;
                    colorImagesArr.push(color_item);
                }
                product_info['color_images'] = colorImagesArr;
            }
        });

        // 获取商品规格
        let product_specifications = [];
        $('div[class*="product-facts-detail"]').each(function () {
            let title = $(this).find('div[class*="a-col-left"]').text();
            let value = $(this).find('div[class*="a-col-right"]').text();
            product_specifications.push({
                title: title.trim(),
                value: value.trim()
            });
        });
        product_info['spec_props'] = product_specifications;

        // 商品描述
        let product_descs = [];
        $('div[class*="a-list-item a-size-base a-color-base"]').each(function () {
            product_descs.push($(this).text().replace(brand_name, '').trim());
        })
        product_info['product_offical_arrs'] = product_descs;

        let descHtml = $("#productDescription").html();
        if (descHtml) {
            specs_arrs = descHtml.split(/<br\s*\/?>/i);
            let cleanedSpecs = specs_arrs.map(line => line.replace(/<[^>]+>/g, '').trim());
            cleanedSpecs = cleanedSpecs.filter(line => line.trim() !== '');
            let diy_arrs = [];
            cleanedSpecs.forEach(line => {
                if (line.includes(':')) {
                    product_specifications.push({
                        title: line.split(':')[0],
                        value: line.split(':')[1]
                    });
                } else {
                    diy_arrs.push(line);
                }
            });
            product_info['spec_props'] = product_specifications;
            product_info['product_diy_arrs'] = diy_arrs;
        }

        let sizeChartHtml = $('#a-popover-sizeChartV2').html();
        if (sizeChartHtml) {
            product_info['size_chart_html'] = sizeChartHtml;
        }

        let send_json = {
            'template': selectedTemplate,
            'scrapeKey': selectedIdentity,
            'item_url': window.location.href,
            'product_info': product_info,
            'scrape_type': 'single'
        };

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
                    alert("抓取成功");
                }
            })
            .catch(error => {
                if (!window.location.href.includes('open_mode=auto')) {
                    alert("抓取失败");
                }
            });

    }

    // performScrape函数结束

    // 手动执行抓取操作��及批量操作
    $('#dynamic-scrape').click(function () {
        if (!window.location.href.includes('/dp/')) {  // 列表页面批量抓取选择商品
            batch_selected_scrape();
        } else {
            do_scrape();  // 商品详情页面，手动抓取单个商品
        }
    });

    // 自动抓取，点击自动抓取按钮
    $('#auto-scrape').click(function () {
        auto_scrape_page();
    });

    // 后台抓取
    $('#background-scrape').click(function () {
        let c_url = window.location.href;
        let selectedTemplate = $('#dynamic-template').val();

        // 从chrome.storage中获取身份设置
        chrome.storage.sync.get(['scrapeKey'], function (result) {
            let selectedIdentity = result.scrapeKey;

            if (!selectedIdentity) {
                alert('请在插件弹窗中设置身份标识');
                return;
            }
            if (c_url.includes('amazon.com/s')) {
                let send_json = {
                    'template': selectedTemplate,
                    'scrapeKey': selectedIdentity,
                    'scrape_type': 'batch',
                    'item_url': c_url,
                };

                // 使用jQuery获取当前cookies
                let cookies = document.cookie;
                let cookies_attrs = [];
                cookies.split(';').forEach(function (cookie) {
                    let [name, value] = cookie.split('=');
                    cookies_attrs.push({
                        name: name.trim(),
                        value: value.trim(),
                        domain: '.amazon.com',
                        path: '/',
                        secure: false,
                        httpOnly: false,
                    });
                });
                send_json['cookies'] = cookies_attrs;

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
                            alert("抓取成功");
                        }
                    })
                    .catch(error => {
                        if (!window.location.href.includes('open_mode=auto')) {
                            alert("抓取失败");
                        }
                    });
            }
        });
    });

    // 自动抓取亚马逊详情页面数据，并再延迟10s，直接执行抓取动作
    if (window.location.href.includes('/dp/') && window.location.href.includes('amazon.com') && window.location.href.includes('open_mode=auto')) {
        setTimeout(function () {
            do_scrape();
            setTimeout(function () {
                window.close();
            }, 10 * 1000);
        }, 5 * 1000);
    }

    // 自动抓取列表页面数据
    if (window.location.href.includes('amazon.com/s') && window.location.href.includes('open_mode=auto')) {
        setTimeout(function () {
            auto_scrape_list();
            // setTimeout(function () {
            //     window.close();
            // }, 1000 * 60 * 5); // 5分钟
        }, 10 * 1000);
    }

});
